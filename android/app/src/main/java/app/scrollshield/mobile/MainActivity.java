package app.scrollshield.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScrollShieldNativePlugin.class);
        registerPlugin(ScrollShieldDiagnosticsPlugin.class);
        registerPlugin(ScrollShieldNotificationPlugin.class);
        registerPlugin(ScrollShieldBillingPlugin.class);
        registerPlugin(ScrollShieldIntegrityPlugin.class);
        registerPlugin(ScrollShieldSubscriptionIdentityPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
