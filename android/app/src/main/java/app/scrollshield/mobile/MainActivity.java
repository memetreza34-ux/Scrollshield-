package app.scrollshield.mobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the native bridge plugin before super.onCreate()
        registerPlugin(ScrollShieldBridgePlugin.class);
        registerPlugin(ScrollShieldBillingPlugin.class);
        registerPlugin(ScrollShieldIdentityPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
