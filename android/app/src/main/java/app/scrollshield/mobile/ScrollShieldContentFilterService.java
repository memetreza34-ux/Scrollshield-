package app.scrollshield.mobile;

import android.accessibilityservice.AccessibilityService;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.content.Intent;
import java.util.Arrays;
import java.util.List;

public class ScrollShieldContentFilterService extends AccessibilityService {

    private static final String TAG = "ScrollShieldFilter";

    // Beispiel-Liste für Toxische/NSFW-Keywords
    // In der Realität würden diese aus dem Capacitor State deines Frontends kommen!
    private final List<String> BLOCKED_KEYWORDS = Arrays.asList(
        "nsfw", "porn", "onlyfans", "gore", "doomscroll"
    );

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode != null) {
            checkNodeForToxicContent(rootNode);
        }
    }

    private void checkNodeForToxicContent(AccessibilityNodeInfo node) {
        if (node == null) return;

        CharSequence text = node.getText();
        CharSequence contentDescription = node.getContentDescription();

        String nodeText = "";
        if (text != null) nodeText += text.toString().toLowerCase() + " ";
        if (contentDescription != null) nodeText += contentDescription.toString().toLowerCase();

        for (String keyword : BLOCKED_KEYWORDS) {
            if (nodeText.contains(keyword)) {
                Log.w(TAG, "🚨 BLOCKED CONTENT DETECTED: " + keyword);
                triggerScrollShieldIntervention();
                return; 
            }
        }

        // Rekursiv alle Kind-Elemente auf dem Screen prüfen
        for (int i = 0; i < node.getChildCount(); i++) {
            checkNodeForToxicContent(node.getChild(i));
        }
    }

    private void triggerScrollShieldIntervention() {
        // Hier feuern wir einen Intent, um die MainActivity (React App) in den Vordergrund zu holen
        // und den "Notfall-Schild" Bildschirm anzuzeigen.
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("ACTION", "TRIGGER_CONTENT_SHIELD");
        startActivity(intent);
        
        // Optional: Perform global action (z.B. Home-Button simulieren um die aktuelle App zu minimieren)
        performGlobalAction(GLOBAL_ACTION_HOME);
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service interrupted");
    }
}
