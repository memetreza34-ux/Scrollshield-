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
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

public class ScrollShieldProtectionService extends Service {
    private static final String CHANNEL_ID = "scrollshield_protection";
    private static final String ACTION_STOP = "app.scrollshield.mobile.action.STOP_PROTECTION";
    private static final String USAGE_KEY_PREFIX = "usage_ms_";
    private static final String OPEN_KEY_PREFIX = "open_events_";
    private static final String EMERGENCY_KEY_PREFIX = "emergency_count_";
    private static final int NOTIFICATION_ID = 2207;
    private static final long POLL_INTERVAL_MS = 900L;
    private static final long USAGE_FLUSH_INTERVAL_MS = 10_000L;
    private static final long CONFIGURATION_HEALTH_INTERVAL_MS = 30_000L;
    private static final long MAX_USAGE_TICK_MS = 5_000L;
    private static final AtomicBoolean RUNNING = new AtomicBoolean(false);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, ProtectionRule> rulesByPackage = new HashMap<>();
    private final Map<String, Long> temporaryAccessUntil = new HashMap<>();
    private final Map<String, Long> pendingUsageMs = new HashMap<>();

    private WindowManager windowManager;
    private View overlayView;
    private String overlayPackage;
    private String cachedConfigJson = "";
    private boolean focusMode;
    private boolean hasActiveConfiguredRule;
    private boolean explicitStopRequested;
    private Runnable countdownRunnable;
    private String lastDetectedForegroundPackage;
    private String lastUsagePackage;
    private long lastUsageTickMs;
    private long lastUsageFlushMs;
    private long lastConfigurationHealthCheckMs;

    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                refreshConfiguration();
                enforceCurrentApp();
            } catch (RuntimeException error) {
                error.printStackTrace();
            } finally {
                if (RUNNING.get()) {
                    handler.postDelayed(this, POLL_INTERVAL_MS);
                }
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
        lastUsageTickMs = System.currentTimeMillis();
        lastUsageFlushMs = lastUsageTickMs;
        handler.post(pollRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            explicitStopRequested = true;
            ScrollShieldNativePlugin.setProtectionEnabled(this, false);
            ScrollShieldNativePlugin.recordProtectionStop(
                this,
                ProtectionServiceLifecyclePolicy.NOTIFICATION_ACTION_STOP_CODE,
                "Der Android-Schutz wurde über die Dauerbenachrichtigung manuell gestoppt"
            );
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!ScrollShieldNativePlugin.isProtectionEnabled(this)) {
            explicitStopRequested = true;
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!ScrollShieldNativePlugin.hasConfiguredApps(this)) {
            stopForMissingPermission(
                "Keine aktive installierte Ziel-App ist mehr konfiguriert; der Android-Schutz wurde gestoppt"
            );
            return START_NOT_STICKY;
        }
        if (!ScrollShieldNativePlugin.hasUsageAccess(this)) {
            stopForMissingPermission("Nutzungszugriff fehlt; der Android-Schutz wurde gestoppt");
            return START_NOT_STICKY;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopForMissingPermission("Overlay-Berechtigung fehlt; der Android-Schutz wurde gestoppt");
            return START_NOT_STICKY;
        }
        if (!ScrollShieldNativePlugin.hasNotificationsEnabled(this)) {
            stopForMissingPermission(
                "Benachrichtigungen fehlen; der Android-Schutz wurde beendet, damit er nicht unsichtbar läuft"
            );
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        boolean unexpectedDestroy = ProtectionServiceLifecyclePolicy.shouldRecordUnexpectedDestroy(
            ScrollShieldNativePlugin.isProtectionEnabled(this),
            explicitStopRequested
        );
        if (unexpectedDestroy) {
            String description =
                "Android hat den Schutzdienst unerwartet beendet; die gespeicherte Aktivierung wurde aus Sicherheitsgründen zurückgesetzt";
            ScrollShieldNativePlugin.setProtectionEnabled(this, false);
            ScrollShieldNativePlugin.appendProtectionEvent(this, "warning", "system", description);
            ScrollShieldNativePlugin.recordProtectionStop(
                this,
                ProtectionServiceLifecyclePolicy.UNEXPECTED_SERVICE_DESTROY_CODE,
                description
            );
        }

        handler.removeCallbacksAndMessages(null);
        flushPendingUsage(System.currentTimeMillis(), true);
        hideOverlay();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        RUNNING.set(false);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void enforceCurrentApp() {
        if (!ScrollShieldNativePlugin.isProtectionEnabled(this)) {
            explicitStopRequested = true;
            stopSelf();
            return;
        }
        if (!ScrollShieldNativePlugin.hasNotificationsEnabled(this)) {
            stopForMissingPermission(
                "Benachrichtigungen wurden entzogen; der Android-Schutz wurde beendet, damit er nicht unsichtbar läuft"
            );
            return;
        }
        if (!ScrollShieldNativePlugin.hasUsageAccess(this)) {
            stopForMissingPermission("Nutzungszugriff wurde entzogen; der Android-Schutz wurde gestoppt");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopForMissingPermission("Overlay-Berechtigung wurde entzogen; der Android-Schutz wurde gestoppt");
            return;
        }
        if (!hasActiveConfiguredRule) {
            stopForMissingPermission(
                "Keine aktive Schutzregel ist mehr konfiguriert; der Android-Schutz wurde gestoppt"
            );
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastConfigurationHealthCheckMs >= CONFIGURATION_HEALTH_INTERVAL_MS) {
            lastConfigurationHealthCheckMs = now;
            if (!ScrollShieldNativePlugin.hasConfiguredApps(this)) {
                stopForMissingPermission(
                    "Keine aktive installierte Ziel-App ist mehr verfügbar; der Android-Schutz wurde gestoppt"
                );
                return;
            }
        }

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null && !powerManager.isInteractive()) {
            recordAllowedUsage(null, now);
            hideOverlay();
            return;
        }

        String foregroundPackage = getForegroundPackage();
        recordAllowedUsage(foregroundPackage, now);

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
        if (allowedUntil > now) {
            hideOverlay();
            return;
        }
        temporaryAccessUntil.remove(foregroundPackage);

        String strictReason = getStrictReason(rule, now);
        int recentWarningOpens = strictReason == null && rule.antiBingeEnabled
            ? countRecentOpens(rule.id, rule.warningWindowMinutes, now)
            : 0;
        boolean antiBingeWarning = strictReason == null && ProtectionRulePolicy.isAntiBingeWarning(
            rule.antiBingeEnabled,
            recentWarningOpens,
            rule.warningThreshold
        );
        int adaptiveDelaySeconds = strictReason == null
            ? AdaptiveFrictionPolicy.resolveDelaySeconds(
                rule.antiBingeEnabled,
                rule.delaySeconds,
                recentWarningOpens,
                rule.warningThreshold
            )
            : rule.delaySeconds;
        if (!foregroundPackage.equals(overlayPackage)) {
            showOverlay(
                foregroundPackage,
                rule,
                strictReason,
                antiBingeWarning,
                adaptiveDelaySeconds,
                recentWarningOpens
            );
        }
    }

    private void stopForMissingPermission(String description) {
        explicitStopRequested = true;
        hideOverlay();
        ScrollShieldNativePlugin.setProtectionEnabled(this, false);
        ScrollShieldNativePlugin.appendProtectionEvent(this, "warning", "system", description);
        stopSelf();
    }

    private String getForegroundPackage() {
        UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usageStatsManager == null) return lastDetectedForegroundPackage;

        long endTime = System.currentTimeMillis();
        UsageEvents usageEvents = usageStatsManager.queryEvents(endTime - 30_000L, endTime);
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

        if (latestPackage != null) {
            lastDetectedForegroundPackage = latestPackage;
        }
        return lastDetectedForegroundPackage;
    }

    private void refreshConfiguration() {
        SharedPreferences preferences = getNativePreferences();
        String configJson = preferences.getString(ScrollShieldNativePlugin.CONFIG_KEY, "{}");
        if (configJson == null || configJson.equals(cachedConfigJson)) return;

        cachedConfigJson = configJson;
        rulesByPackage.clear();
        focusMode = false;
        hasActiveConfiguredRule = false;

        try {
            JSONObject root = new JSONObject(configJson);
            focusMode = root.optBoolean("focusMode", false);
            JSONArray apps = root.optJSONArray("apps");
            if (apps == null) {
                pruneTemporaryAccess();
                return;
            }

            for (int index = 0; index < apps.length(); index++) {
                JSONObject app = apps.optJSONObject(index);
                if (app == null) continue;

                JSONObject timeWindows = app.optJSONObject("timeWindows");
                JSONObject antiBinge = app.optJSONObject("antiBinge");
                JSONObject emergencyUnlock = app.optJSONObject("emergencyUnlock");

                ProtectionRule rule = new ProtectionRule(
                    app.optString("id", "unknown"),
                    app.optString("name", "Geschützte App"),
                    app.optBoolean("active", false),
                    app.optString("mode", "standard"),
                    Math.max(0, app.optInt("delaySeconds", 10)),
                    Math.max(0, app.optInt("dailyLimitMinutes", 0)),
                    Math.max(1, app.optInt("sessionMinutes", 5)),
                    app.optString("blockHours", ""),
                    app.optString("focusModeBehavior", "warn"),
                    timeWindows == null
                        ? ProtectionRulePolicy.NORMAL
                        : ProtectionRulePolicy.normalizeScheduleAction(
                            timeWindows.optString("morningRules", ProtectionRulePolicy.NORMAL)
                        ),
                    timeWindows == null
                        ? ProtectionRulePolicy.NORMAL
                        : ProtectionRulePolicy.normalizeScheduleAction(
                            timeWindows.optString("workRules", ProtectionRulePolicy.NORMAL)
                        ),
                    timeWindows == null
                        ? ProtectionRulePolicy.NORMAL
                        : ProtectionRulePolicy.normalizeScheduleAction(
                            timeWindows.optString("eveningRules", ProtectionRulePolicy.NORMAL)
                        ),
                    timeWindows == null
                        ? ProtectionRulePolicy.NORMAL
                        : ProtectionRulePolicy.normalizeScheduleAction(
                            timeWindows.optString("nightRules", ProtectionRulePolicy.NORMAL)
                        ),
                    timeWindows == null
                        ? ProtectionRulePolicy.NORMAL
                        : ProtectionRulePolicy.normalizeScheduleAction(
                            timeWindows.optString("weekendRules", ProtectionRulePolicy.NORMAL)
                        ),
                    antiBinge != null && antiBinge.optBoolean("enabled", false),
                    antiBinge == null ? 3 : Math.max(1, antiBinge.optInt("warningThreshold", 3)),
                    antiBinge == null ? 10 : Math.max(1, antiBinge.optInt("warningWindowMinutes", 10)),
                    antiBinge == null ? 5 : Math.max(1, antiBinge.optInt("blockThreshold", 5)),
                    antiBinge == null ? 20 : Math.max(1, antiBinge.optInt("blockWindowMinutes", 20)),
                    emergencyUnlock != null && emergencyUnlock.optBoolean("enabled", false),
                    emergencyUnlock == null ? 5 : Math.max(1, emergencyUnlock.optInt("durationMinutes", 5)),
                    emergencyUnlock == null ? 0 : Math.max(0, emergencyUnlock.optInt("maxPerDay", 0)),
                    emergencyUnlock == null || emergencyUnlock.optBoolean("requireCountdown", true),
                    emergencyUnlock == null || emergencyUnlock.optBoolean("requireReason", true)
                );

                JSONArray packages = app.optJSONArray("packages");
                if (packages == null) continue;
                for (int packageIndex = 0; packageIndex < packages.length(); packageIndex++) {
                    String packageName = packages.optString(packageIndex, "");
                    if (packageName.trim().isEmpty()) continue;
                    rulesByPackage.put(packageName, rule);
                    if (rule.active) hasActiveConfiguredRule = true;
                }
            }
            pruneTemporaryAccess();
        } catch (JSONException error) {
            rulesByPackage.clear();
            hasActiveConfiguredRule = false;
            pruneTemporaryAccess();
            error.printStackTrace();
        }
    }

    private void pruneTemporaryAccess() {
        Iterator<String> iterator = temporaryAccessUntil.keySet().iterator();
        while (iterator.hasNext()) {
            if (!rulesByPackage.containsKey(iterator.next())) iterator.remove();
        }
    }

    private String getStrictReason(ProtectionRule rule, long now) {
        if (ProtectionRulePolicy.isDailyLimitReached(
            rule.dailyLimitMinutes,
            getDailyUsageMs(rule.id, now)
        )) {
            return "Dein Tageslimit von " + rule.dailyLimitMinutes + " Minuten ist erreicht.";
        }

        String scheduledAction = getScheduledAction(rule, now);
        if (ProtectionRulePolicy.BLOCK.equals(scheduledAction)) {
            return "Diese App ist durch deinen wiederkehrenden Wochenplan gesperrt.";
        }
        if (ProtectionRulePolicy.STRICT.equals(scheduledAction)) {
            return "Für dieses Zeitfenster gilt dein strenger Wochenplan.";
        }

        if (isInsideBlockedHours(rule.blockHours, now)) {
            return "Diese App ist in deinem festgelegten Zeitfenster gesperrt.";
        }
        if (isAntiBingeBlocked(rule, now)) {
            return "Zu viele bewusste Öffnungen in kurzer Zeit haben den Anti-Binge-Schutz ausgelöst.";
        }
        if (focusMode && ProtectionRulePolicy.BLOCK.equals(rule.focusModeBehavior)) {
            return "Diese App ist während deiner Fokus-Sitzung gesperrt.";
        }
        if (ProtectionRulePolicy.STRICT.equals(rule.mode)) {
            return "Diese App ist durch deinen strikten Schutzmodus gesperrt.";
        }
        return null;
    }

    private String getScheduledAction(ProtectionRule rule, long now) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(now);
        int minuteOfDay = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE);
        return ProtectionRulePolicy.getScheduledAction(
            calendar.get(Calendar.DAY_OF_WEEK),
            minuteOfDay,
            rule.morningRules,
            rule.workRules,
            rule.eveningRules,
            rule.nightRules,
            rule.weekendRules
        );
    }

    private boolean isAntiBingeBlocked(ProtectionRule rule, long now) {
        int recentOpens = countRecentOpens(rule.id, rule.blockWindowMinutes, now);
        return ProtectionRulePolicy.isAntiBingeBlocked(
            rule.antiBingeEnabled,
            recentOpens,
            rule.blockThreshold
        );
    }

    private void showOverlay(
        String packageName,
        ProtectionRule rule,
        @Nullable String strictReason,
        boolean antiBingeWarning,
        int effectiveNormalDelaySeconds,
        int recentWarningOpens
    ) {
        hideOverlay();
        if (windowManager == null) return;

        boolean strict = strictReason != null;
        boolean adaptiveFrictionActive = !strict && AdaptiveFrictionPolicy.isEscalated(
            rule.antiBingeEnabled,
            rule.delaySeconds,
            recentWarningOpens,
            rule.warningThreshold
        );
        overlayPackage = packageName;

        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setSmoothScrollingEnabled(true);
        scrollView.setVerticalScrollBarEnabled(true);

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setGravity(Gravity.CENTER);
        container.setPadding(dp(28), dp(40), dp(28), dp(40));
        container.setMinimumHeight(getResources().getDisplayMetrics().heightPixels);

        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(9, 9, 11));
        scrollView.setBackground(background);

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

        String explanationText;
        if (strict) {
            explanationText = strictReason;
        } else if (adaptiveFrictionActive) {
            explanationText =
                "Du hast diese App " + recentWarningOpens + "-mal in den letzten "
                + rule.warningWindowMinutes + " Minuten bewusst freigegeben. ScrollShield erhöht die Pause lokal auf "
                + effectiveNormalDelaySeconds + " Sekunden, bevor du erneut entscheidest.";
        } else if (antiBingeWarning) {
            explanationText = "Du hast diese App in kurzer Zeit mehrfach geöffnet. Prüfe bewusst, ob du sie jetzt erneut brauchst.";
        } else {
            explanationText = "Atme kurz durch und entscheide bewusst, ob du die App jetzt öffnen möchtest.";
        }

        TextView explanation = createText(explanationText, 15, Color.rgb(212, 212, 216));
        explanation.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams explanationParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        explanationParams.topMargin = dp(24);
        container.addView(explanation, explanationParams);

        int emergencyCount = getEmergencyCount(rule.id, System.currentTimeMillis());
        boolean emergencyAvailable = strict
            && ProtectionRulePolicy.hasEmergencyAvailable(
                rule.emergencyEnabled,
                emergencyCount,
                rule.emergencyMaxPerDay
            );
        int countdownSeconds = strict
            ? EmergencyUnlockPolicy.resolveCountdownSeconds(
                true,
                emergencyAvailable,
                rule.emergencyRequireCountdown,
                rule.delaySeconds
            )
            : effectiveNormalDelaySeconds;
        final boolean[] countdownFinished = { countdownSeconds <= 0 };

        TextView countdown = createText(
            countdownSeconds > 0 ? String.valueOf(countdownSeconds) : "Bereit",
            46,
            Color.WHITE
        );
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

        @Nullable final EditText emergencyReasonInput;
        if (strict && emergencyAvailable && rule.emergencyRequireReason) {
            emergencyReasonInput = createEmergencyReasonInput();
            LinearLayout.LayoutParams reasonParams = matchWidth();
            reasonParams.topMargin = dp(12);
            container.addView(emergencyReasonInput, reasonParams);
        } else {
            emergencyReasonInput = null;
        }

        String continueLabel;
        if (strict) {
            continueLabel = emergencyAvailable
                ? "Notfall: " + rule.emergencyDurationMinutes + " Minuten öffnen"
                : "Keine Notfallfreigabe verfügbar";
        } else {
            continueLabel = "Bewusst öffnen";
        }

        Button continueButton = createButton(continueLabel, false);
        updateContinueButtonState(
            continueButton,
            !strict || emergencyAvailable,
            countdownFinished[0],
            strict && rule.emergencyRequireReason,
            emergencyReasonInput
        );

        if (emergencyReasonInput != null) {
            emergencyReasonInput.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    updateContinueButtonState(
                        continueButton,
                        emergencyAvailable,
                        countdownFinished[0],
                        true,
                        emergencyReasonInput
                    );
                }

                @Override
                public void afterTextChanged(Editable s) {}
            });
        }

        continueButton.setOnClickListener(view -> {
            long actionTime = System.currentTimeMillis();
            if (strict) {
                String emergencyReason = emergencyReasonInput == null
                    ? ""
                    : EmergencyUnlockPolicy.normalizeReason(emergencyReasonInput.getText().toString());
                boolean stillAvailable = hasEmergencyAvailable(rule, actionTime);
                if (!EmergencyUnlockPolicy.canEmergencyUnlock(
                    stillAvailable,
                    countdownFinished[0],
                    rule.emergencyRequireReason,
                    emergencyReason
                )) {
                    updateContinueButtonState(
                        continueButton,
                        stillAvailable,
                        countdownFinished[0],
                        rule.emergencyRequireReason,
                        emergencyReasonInput
                    );
                    return;
                }

                incrementEmergencyCount(rule.id, actionTime);
                temporaryAccessUntil.put(
                    packageName,
                    actionTime + rule.emergencyDurationMinutes * 60_000L
                );
                String eventDescription =
                    "Notfallfreigabe für " + rule.emergencyDurationMinutes + " Minuten";
                if (!emergencyReason.isEmpty()) {
                    eventDescription += " · Grund: " + emergencyReason;
                }
                ScrollShieldNativePlugin.appendProtectionEvent(
                    this,
                    "emergency",
                    rule.id,
                    eventDescription
                );
            } else {
                if (!countdownFinished[0]) return;
                recordIntentionalOpen(rule.id, actionTime);
                temporaryAccessUntil.put(packageName, actionTime + rule.sessionMinutes * 60_000L);
                ScrollShieldNativePlugin.appendProtectionEvent(
                    this,
                    "open",
                    rule.id,
                    "Bewusst geöffnet für bis zu " + rule.sessionMinutes + " Minuten"
                );
            }
            hideOverlay();
        });
        LinearLayout.LayoutParams continueParams = matchWidth();
        continueParams.topMargin = dp(12);
        container.addView(continueButton, continueParams);

        scrollView.addView(
            container,
            new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT,
                ScrollView.LayoutParams.WRAP_CONTENT
            )
        );

        if (emergencyReasonInput != null) {
            emergencyReasonInput.setOnFocusChangeListener((view, hasFocus) -> {
                if (!hasFocus) return;
                view.postDelayed(
                    () -> scrollView.smoothScrollTo(0, continueButton.getBottom() + dp(24)),
                    150L
                );
            });
        }

        WindowManager.LayoutParams layoutParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        layoutParams.gravity = Gravity.TOP | Gravity.START;
        layoutParams.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;

        overlayView = scrollView;
        try {
            windowManager.addView(overlayView, layoutParams);
            ScrollShieldNativePlugin.appendProtectionEvent(
                this,
                strict ? "block" : "warning",
                rule.id,
                strict
                    ? strictReason
                    : adaptiveFrictionActive
                        ? "Adaptive Anti-Binge-Pause: " + effectiveNormalDelaySeconds
                            + " Sekunden nach " + recentWarningOpens + " bewussten Öffnungen"
                        : antiBingeWarning
                            ? "Anti-Binge-Warnung vor erneuter Öffnung"
                            : "Bewusste Öffnungspause ausgelöst"
            );
            startCountdown(
                countdown,
                continueButton,
                countdownSeconds,
                !strict || emergencyAvailable,
                countdownFinished,
                strict && rule.emergencyRequireReason,
                emergencyReasonInput
            );
        } catch (RuntimeException error) {
            overlayView = null;
            overlayPackage = null;
            error.printStackTrace();
        }
    }

    private void startCountdown(
        TextView countdown,
        Button continueButton,
        int seconds,
        boolean eligibleWhenFinished,
        boolean[] countdownFinished,
        boolean requireReason,
        @Nullable EditText reasonInput
    ) {
        if (seconds <= 0) {
            countdownFinished[0] = true;
            countdown.setText("Bereit");
            updateContinueButtonState(
                continueButton,
                eligibleWhenFinished,
                true,
                requireReason,
                reasonInput
            );
            return;
        }

        countdownFinished[0] = false;
        final int[] remaining = { seconds };
        countdownRunnable = new Runnable() {
            @Override
            public void run() {
                if (overlayView == null) return;
                remaining[0] -= 1;
                if (remaining[0] <= 0) {
                    countdownFinished[0] = true;
                    countdown.setText("Bereit");
                    updateContinueButtonState(
                        continueButton,
                        eligibleWhenFinished,
                        true,
                        requireReason,
                        reasonInput
                    );
                    countdownRunnable = null;
                    return;
                }
                countdown.setText(String.valueOf(remaining[0]));
                handler.postDelayed(this, 1_000L);
            }
        };
        handler.postDelayed(countdownRunnable, 1_000L);
    }

    private void updateContinueButtonState(
        Button continueButton,
        boolean eligible,
        boolean countdownFinished,
        boolean requireReason,
        @Nullable EditText reasonInput
    ) {
        String reason = reasonInput == null ? "" : reasonInput.getText().toString();
        boolean enabled = eligible
            && countdownFinished
            && EmergencyUnlockPolicy.isReasonSatisfied(requireReason, reason);
        continueButton.setEnabled(enabled);
        continueButton.setAlpha(enabled ? 1f : 0.45f);
    }

    private EditText createEmergencyReasonInput() {
        EditText input = new EditText(this);
        input.setHint("Warum brauchst du den Notfallzugang?");
        input.setTextColor(Color.WHITE);
        input.setHintTextColor(Color.rgb(113, 113, 122));
        input.setTextSize(14);
        input.setSingleLine(false);
        input.setMaxLines(3);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        input.setFilters(new InputFilter[] {
            new InputFilter.LengthFilter(EmergencyUnlockPolicy.MAX_REASON_CHARACTERS),
        });
        input.setPadding(dp(16), dp(14), dp(16), dp(14));

        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(24, 24, 27));
        background.setStroke(dp(1), Color.rgb(63, 63, 70));
        background.setCornerRadius(dp(14));
        input.setBackground(background);
        return input;
    }

    private void recordAllowedUsage(@Nullable String foregroundPackage, long now) {
        if (lastUsageTickMs <= 0L) {
            lastUsageTickMs = now;
            lastUsagePackage = foregroundPackage;
            return;
        }

        if (lastUsagePackage != null && now > lastUsageTickMs) {
            ProtectionRule previousRule = rulesByPackage.get(lastUsagePackage);
            Long allowedUntil = temporaryAccessUntil.get(lastUsagePackage);
            if (previousRule != null && allowedUntil != null && allowedUntil > lastUsageTickMs) {
                long countedUntil = Math.min(now, allowedUntil);
                long boundedEnd = Math.min(countedUntil, lastUsageTickMs + MAX_USAGE_TICK_MS);
                if (boundedEnd > lastUsageTickMs) {
                    addPendingUsage(previousRule.id, lastUsageTickMs, boundedEnd);
                }
            }
        }

        lastUsagePackage = foregroundPackage;
        lastUsageTickMs = now;
        flushPendingUsage(now, false);
    }

    private void addPendingUsage(String appId, long startMs, long endMs) {
        if (endMs <= startMs) return;

        String startDay = getDayKey(startMs);
        String endDay = getDayKey(endMs - 1L);
        if (startDay.equals(endDay)) {
            addPendingUsageBucket(startDay, appId, endMs - startMs);
            return;
        }

        Calendar boundaryCalendar = Calendar.getInstance();
        boundaryCalendar.setTimeInMillis(endMs);
        boundaryCalendar.set(Calendar.HOUR_OF_DAY, 0);
        boundaryCalendar.set(Calendar.MINUTE, 0);
        boundaryCalendar.set(Calendar.SECOND, 0);
        boundaryCalendar.set(Calendar.MILLISECOND, 0);
        long boundaryMs = boundaryCalendar.getTimeInMillis();
        long[] split = UsageAccountingPolicy.splitAtBoundary(startMs, endMs, boundaryMs);

        if (split[1] <= 0L) {
            addPendingUsageBucket(endDay, appId, split[0]);
            return;
        }

        addPendingUsageBucket(startDay, appId, split[0]);
        addPendingUsageBucket(endDay, appId, split[1]);
    }

    private void addPendingUsageBucket(String dayKey, String appId, long durationMs) {
        if (durationMs <= 0L) return;
        String bucketKey = dayKey + "_" + appId;
        long pending = pendingUsageMs.containsKey(bucketKey) ? pendingUsageMs.get(bucketKey) : 0L;
        pendingUsageMs.put(bucketKey, pending + durationMs);
    }

    private void flushPendingUsage(long now, boolean force) {
        if (pendingUsageMs.isEmpty()) return;
        if (!force && now - lastUsageFlushMs < USAGE_FLUSH_INTERVAL_MS) return;

        SharedPreferences preferences = getNativePreferences();
        SharedPreferences.Editor editor = preferences.edit();
        for (Map.Entry<String, Long> entry : pendingUsageMs.entrySet()) {
            String key = USAGE_KEY_PREFIX + entry.getKey();
            long existing = preferences.getLong(key, 0L);
            editor.putLong(key, existing + entry.getValue());
        }
        if (editor.commit()) {
            pendingUsageMs.clear();
            lastUsageFlushMs = now;
        }
    }

    private long getDailyUsageMs(String appId, long now) {
        String dayAndAppKey = getDayKey(now) + "_" + appId;
        String key = USAGE_KEY_PREFIX + dayAndAppKey;
        long persisted = getNativePreferences().getLong(key, 0L);
        long pending = pendingUsageMs.containsKey(dayAndAppKey) ? pendingUsageMs.get(dayAndAppKey) : 0L;
        return persisted + pending;
    }

    private void recordIntentionalOpen(String appId, long now) {
        SharedPreferences preferences = getNativePreferences();
        String key = OPEN_KEY_PREFIX + getDayKey(now) + "_" + appId;
        JSONArray result = new JSONArray();
        long cutoff = now - 24L * 60L * 60L * 1_000L;

        try {
            String raw = preferences.getString(key, "[]");
            JSONArray existing = new JSONArray(raw == null ? "[]" : raw);
            for (int index = 0; index < existing.length(); index++) {
                long timestamp = existing.optLong(index, 0L);
                if (timestamp >= cutoff) result.put(timestamp);
            }
        } catch (JSONException ignored) {
            // A corrupted local counter is safely reset.
        }

        result.put(now);
        while (result.length() > 100) result.remove(0);
        preferences.edit().putString(key, result.toString()).apply();
    }

    private int countRecentOpens(String appId, int windowMinutes, long now) {
        SharedPreferences preferences = getNativePreferences();
        long cutoff = now - Math.max(1, windowMinutes) * 60_000L;
        String currentDay = getDayKey(now);
        String previousDay = getPreviousDayKey(now);

        int count = countRecentOpensForKey(
            preferences,
            OPEN_KEY_PREFIX + currentDay + "_" + appId,
            cutoff
        );
        if (!previousDay.equals(currentDay)) {
            count += countRecentOpensForKey(
                preferences,
                OPEN_KEY_PREFIX + previousDay + "_" + appId,
                cutoff
            );
        }
        return count;
    }

    private int countRecentOpensForKey(SharedPreferences preferences, String key, long cutoff) {
        int count = 0;
        try {
            String raw = preferences.getString(key, "[]");
            JSONArray events = new JSONArray(raw == null ? "[]" : raw);
            for (int index = 0; index < events.length(); index++) {
                if (events.optLong(index, 0L) >= cutoff) count += 1;
            }
        } catch (JSONException ignored) {
            return 0;
        }
        return count;
    }

    private int getEmergencyCount(String appId, long now) {
        String key = EMERGENCY_KEY_PREFIX + getDayKey(now) + "_" + appId;
        return getNativePreferences().getInt(key, 0);
    }

    private boolean hasEmergencyAvailable(ProtectionRule rule, long now) {
        return ProtectionRulePolicy.hasEmergencyAvailable(
            rule.emergencyEnabled,
            getEmergencyCount(rule.id, now),
            rule.emergencyMaxPerDay
        );
    }

    private void incrementEmergencyCount(String appId, long now) {
        SharedPreferences preferences = getNativePreferences();
        String key = EMERGENCY_KEY_PREFIX + getDayKey(now) + "_" + appId;
        preferences.edit().putInt(key, preferences.getInt(key, 0) + 1).apply();
    }

    private boolean isInsideBlockedHours(String blockHours, long now) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(now);
        int minuteOfDay = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE);
        return ProtectionRulePolicy.isInsideBlockedHours(blockHours, minuteOfDay);
    }

    private String getPreviousDayKey(long timestamp) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(timestamp);
        calendar.add(Calendar.DAY_OF_YEAR, -1);
        return getDayKey(calendar.getTimeInMillis());
    }

    private String getDayKey(long timestamp) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(timestamp));
    }

    private SharedPreferences getNativePreferences() {
        return getSharedPreferences(ScrollShieldNativePlugin.PREFERENCES_NAME, Context.MODE_PRIVATE);
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
        private final int dailyLimitMinutes;
        private final int sessionMinutes;
        private final String blockHours;
        private final String focusModeBehavior;
        private final String morningRules;
        private final String workRules;
        private final String eveningRules;
        private final String nightRules;
        private final String weekendRules;
        private final boolean antiBingeEnabled;
        private final int warningThreshold;
        private final int warningWindowMinutes;
        private final int blockThreshold;
        private final int blockWindowMinutes;
        private final boolean emergencyEnabled;
        private final int emergencyDurationMinutes;
        private final int emergencyMaxPerDay;
        private final boolean emergencyRequireCountdown;
        private final boolean emergencyRequireReason;

        private ProtectionRule(
            String id,
            String name,
            boolean active,
            String mode,
            int delaySeconds,
            int dailyLimitMinutes,
            int sessionMinutes,
            String blockHours,
            String focusModeBehavior,
            String morningRules,
            String workRules,
            String eveningRules,
            String nightRules,
            String weekendRules,
            boolean antiBingeEnabled,
            int warningThreshold,
            int warningWindowMinutes,
            int blockThreshold,
            int blockWindowMinutes,
            boolean emergencyEnabled,
            int emergencyDurationMinutes,
            int emergencyMaxPerDay,
            boolean emergencyRequireCountdown,
            boolean emergencyRequireReason
        ) {
            this.id = id;
            this.name = name;
            this.active = active;
            this.mode = mode;
            this.delaySeconds = delaySeconds;
            this.dailyLimitMinutes = dailyLimitMinutes;
            this.sessionMinutes = sessionMinutes;
            this.blockHours = blockHours;
            this.focusModeBehavior = focusModeBehavior;
            this.morningRules = morningRules;
            this.workRules = workRules;
            this.eveningRules = eveningRules;
            this.nightRules = nightRules;
            this.weekendRules = weekendRules;
            this.antiBingeEnabled = antiBingeEnabled;
            this.warningThreshold = warningThreshold;
            this.warningWindowMinutes = warningWindowMinutes;
            this.blockThreshold = blockThreshold;
            this.blockWindowMinutes = blockWindowMinutes;
            this.emergencyEnabled = emergencyEnabled;
            this.emergencyDurationMinutes = emergencyDurationMinutes;
            this.emergencyMaxPerDay = emergencyMaxPerDay;
            this.emergencyRequireCountdown = emergencyRequireCountdown;
            this.emergencyRequireReason = emergencyRequireReason;
        }
    }
}
