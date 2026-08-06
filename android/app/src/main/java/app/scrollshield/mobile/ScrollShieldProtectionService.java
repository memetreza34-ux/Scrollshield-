package app.scrollshield.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

public class ScrollShieldProtectionService extends Service {
    private static final String CHANNEL_ID = "scrollshield_protection";
    private static final String ACTION_STOP = "app.scrollshield.mobile.action.STOP_PROTECTION";
    private static final int NOTIFICATION_ID = 2207;
    private static final long POLL_INTERVAL_MS = 900L;
    private static final AtomicBoolean RUNNING = new AtomicBoolean(false);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, ProtectionRule> rulesByPackage = new HashMap<>();
    private final Map<String, Long> temporaryAccessUntil = new HashMap<>();

    private WindowManager windowManager;
    private View overlayView;
    private String overlayPackage;
    private String cachedConfigJson = "";
    private boolean focusMode;
    private Runnable countdownRunnable;

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                refreshConfiguration();
                enforceCurrentApp();
            } catch (RuntimeException error) {
                error.printStackTrace();
            } finally {
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        }
    };

    public static boolean isRunning() {
        return RUNNING.get();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        RUNNING.set(true);
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, createNotification());
        handler.post(pollRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        hideOverlay();
        RUNNING.set(false);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void enforceCurrentApp() {
        if (!ScrollShieldNativePlugin.hasUsageAccess(this)) {
            hideOverlay();
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            hideOverlay();
            return;
        }

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null && !powerManager.isInteractive()) {
            hideOverlay();
            return;
        }

        String foregroundPackage = getForegroundPackage();
        if (foregroundPackage == null || foregroundPackage.equals(getPackageName())) {
            hideOverlay();
            return;
        }

        ProtectionRule rule = rulesByPackage.get(foregroundPackage);
        if (rule == null || !rule.active) {
            if (overlayPackage != null && !overlayPackage.equals(foregroundPackage)) hideOverlay();
            return;
        }

        long allowedUntil = temporaryAccessUntil.containsKey(foregroundPackage)
            ? temporaryAccessUntil.get(foregroundPackage)
            : 0L;
        if (allowedUntil > System.currentTimeMillis()) {
            hideOverlay();
            return;
        }
        temporaryAccessUntil.remove(foregroundPackage);

        boolean strict = "strict".equals(rule.mode)
            || (focusMode && "block".equals(rule.focusModeBehavior));
        if (!foregroundPackage.equals(overlayPackage)) {
            showOverlay(foregroundPackage, rule, strict);
        }
    }

    private String getForegroundPackage() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) return null;

        long endTime = System.currentTimeMillis();
        UsageEvents usageEvents = usageStatsManager.queryEvents(endTime - 10_000L, endTime);
        UsageEvents.Event event = new UsageEvents.Event();
        String latestPackage = null;
        long latestTimestamp = 0L;

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event);
            int eventType = event.getEventType();
            boolean foregroundEvent = eventType == UsageEvents.Event.MOVE_TO_FOREGROUND;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                foregroundEvent = foregroundEvent || eventType == UsageEvents.Event.ACTIVITY_RESUMED;
            }
            if (foregroundEvent && event.getTimeStamp() >= latestTimestamp) {
                latestTimestamp = event.getTimeStamp();
                latestPackage = event.getPackageName();
            }
        }
        return latestPackage;
    }

    private void refreshConfiguration() {
        SharedPreferences preferences = getSharedPreferences(
            ScrollShieldNativePlugin.PREFERENCES_NAME,
            Context.MODE_PRIVATE
        );
        String configJson = preferences.getString(ScrollShieldNativePlugin.CONFIG_KEY, "{}");
        if (configJson == null || configJson.equals(cachedConfigJson)) return;

        cachedConfigJson = configJson;
        rulesByPackage.clear();
        focusMode = false;

        try {
            JSONObject root = new JSONObject(configJson);
            focusMode = root.optBoolean("focusMode", false);
            JSONArray apps = root.optJSONArray("apps");
            if (apps == null) return;

            for (int index = 0; index < apps.length(); index++) {
                JSONObject app = apps.optJSONObject(index);
                if (app == null) continue;

                ProtectionRule rule = new ProtectionRule(
                    app.optString("id", "unknown"),
                    app.optString("name", "Geschützte App"),
                    app.optBoolean("active", false),
                    app.optString("mode", "standard"),
                    Math.max(0, app.optInt("delaySeconds", 10)),
                    Math.max(1, app.optInt("sessionMinutes", 5)),
                    app.optString("focusModeBehavior", "warn")
                );

                JSONArray packages = app.optJSONArray("packages");
                if (packages == null) continue;
                for (int packageIndex = 0; packageIndex < packages.length(); packageIndex++) {
                    String packageName = packages.optString(packageIndex, "");
                    if (!packageName.trim().isEmpty()) rulesByPackage.put(packageName, rule);
                }
            }
        } catch (JSONException error) {
            error.printStackTrace();
        }
    }

    private void showOverlay(String packageName, ProtectionRule rule, boolean strict) {
        hideOverlay();
        if (windowManager == null) return;

        overlayPackage = packageName;
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setGravity(Gravity.CENTER);
        container.setPadding(dp(28), dp(40), dp(28), dp(40));

        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(9, 9, 11));
        container.setBackground(background);

        TextView badge = createText("SCROLLSHIELD", 12, Color.rgb(52, 211, 153));
        badge.setLetterSpacing(0.18f);
        container.addView(badge, wrapContent());

        TextView title = createText(strict ? "App blockiert" : "Kurze Pause", 30, Color.WHITE);
        LinearLayout.LayoutParams titleParams = wrapContent();
        titleParams.topMargin = dp(20);
        container.addView(title, titleParams);

        TextView appName = createText(rule.name, 18, Color.rgb(161, 161, 170));
        LinearLayout.LayoutParams appParams = wrapContent();
        appParams.topMargin = dp(8);
        container.addView(appName, appParams);

        TextView explanation = createText(
            strict
                ? "Diese App ist durch deine aktuelle Schutzregel gesperrt."
                : "Atme kurz durch und entscheide bewusst, ob du die App jetzt öffnen möchtest.",
            15,
            Color.rgb(212, 212, 216)
        );
        explanation.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams explanationParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        explanationParams.topMargin = dp(24);
        container.addView(explanation, explanationParams);

        int countdownSeconds = strict ? Math.max(30, rule.delaySeconds) : rule.delaySeconds;
        TextView countdown = createText(String.valueOf(countdownSeconds), 46, Color.WHITE);
        LinearLayout.LayoutParams countdownParams = wrapContent();
        countdownParams.topMargin = dp(28);
        container.addView(countdown, countdownParams);

        Button returnButton = createButton("Zurück zum Startbildschirm", true);
        returnButton.setOnClickListener(view -> {
            hideOverlay();
            Intent homeIntent = new Intent(Intent.ACTION_MAIN);
            homeIntent.addCategory(Intent.CATEGORY_HOME);
            homeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(homeIntent);
        });
        LinearLayout.LayoutParams returnParams = matchWidth();
        returnParams.topMargin = dp(30);
        container.addView(returnButton, returnParams);

        Button continueButton = createButton(
            strict ? "Notfall: 5 Minuten öffnen" : "Bewusst öffnen",
            false
        );
        continueButton.setEnabled(countdownSeconds == 0);
        continueButton.setAlpha(countdownSeconds == 0 ? 1f : 0.45f);
        continueButton.setOnClickListener(view -> {
            int minutes = strict ? 5 : rule.sessionMinutes;
            temporaryAccessUntil.put(packageName, System.currentTimeMillis() + minutes * 60_000L);
            ScrollShieldNativePlugin.appendProtectionEvent(
                this,
                strict ? "emergency" : "open",
                rule.id,
                strict
                    ? "Notfallfreigabe für 5 Minuten"
                    : "Bewusst geöffnet für bis zu " + minutes + " Minuten"
            );
            hideOverlay();
        });
        LinearLayout.LayoutParams continueParams = matchWidth();
        continueParams.topMargin = dp(12);
        container.addView(continueButton, continueParams);

        WindowManager.LayoutParams layoutParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        layoutParams.gravity = Gravity.TOP | Gravity.START;

        overlayView = container;
        try {
            windowManager.addView(overlayView, layoutParams);
            ScrollShieldNativePlugin.appendProtectionEvent(
                this,
                strict ? "block" : "warning",
                rule.id,
                strict ? "Durch Android-Schutz blockiert" : "Bewusste Öffnungspause ausgelöst"
            );
            startCountdown(countdown, continueButton, countdownSeconds);
        } catch (RuntimeException error) {
            overlayView = null;
            overlayPackage = null;
            error.printStackTrace();
        }
    }

    private void startCountdown(TextView countdown, Button continueButton, int seconds) {
        if (seconds <= 0) {
            countdown.setText("Bereit");
            return;
        }

        final int[] remaining = { seconds };
        countdownRunnable = new Runnable() {
            @Override
            public void run() {
                if (overlayView == null) return;
                remaining[0] -= 1;
                if (remaining[0] <= 0) {
                    countdown.setText("Bereit");
                    continueButton.setEnabled(true);
                    continueButton.setAlpha(1f);
                    countdownRunnable = null;
                    return;
                }
                countdown.setText(String.valueOf(remaining[0]));
                handler.postDelayed(this, 1_000L);
            }
        };
        handler.postDelayed(countdownRunnable, 1_000L);
    }

    private void hideOverlay() {
        if (countdownRunnable != null) {
            handler.removeCallbacks(countdownRunnable);
            countdownRunnable = null;
        }
        if (overlayView != null && windowManager != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (RuntimeException ignored) {
                // The system may already have removed the overlay after a permission change.
            }
        }
        overlayView = null;
        overlayPackage = null;
    }

    private Notification createNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent launchPendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, ScrollShieldProtectionService.class).setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);

        return builder
            .setContentTitle("ScrollShield ist aktiv")
            .setContentText("Deine ausgewählten Apps werden lokal überwacht.")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentIntent(launchPendingIntent)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Schutz stoppen", stopPendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Aktiver App-Schutz",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Zeigt an, dass ScrollShield ausgewählte App-Öffnungen überwacht.");
        notificationManager.createNotificationChannel(channel);
    }

    private TextView createText(String text, int sizeSp, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sizeSp);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        return view;
    }

    private Button createButton(String text, boolean primary) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(15);
        button.setAllCaps(false);
        button.setTextColor(primary ? Color.BLACK : Color.WHITE);
        GradientDrawable background = new GradientDrawable();
        background.setColor(primary ? Color.WHITE : Color.rgb(39, 39, 42));
        background.setCornerRadius(dp(18));
        button.setBackground(background);
        button.setPadding(dp(16), dp(14), dp(16), dp(14));
        return button;
    }

    private LinearLayout.LayoutParams wrapContent() {
        return new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
    }

    private LinearLayout.LayoutParams matchWidth() {
        return new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class ProtectionRule {
        private final String id;
        private final String name;
        private final boolean active;
        private final String mode;
        private final int delaySeconds;
        private final int sessionMinutes;
        private final String focusModeBehavior;

        private ProtectionRule(
            String id,
            String name,
            boolean active,
            String mode,
            int delaySeconds,
            int sessionMinutes,
            String focusModeBehavior
        ) {
            this.id = id;
            this.name = name;
            this.active = active;
            this.mode = mode;
            this.delaySeconds = delaySeconds;
            this.sessionMinutes = sessionMinutes;
            this.focusModeBehavior = focusModeBehavior;
        }
    }
}
