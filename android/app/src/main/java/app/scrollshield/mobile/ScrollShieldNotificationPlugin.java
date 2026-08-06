package app.scrollshield.mobile;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "ScrollShieldNotifications",
    permissions = @Permission(
        strings = { Manifest.permission.POST_NOTIFICATIONS },
        alias = ScrollShieldNotificationPlugin.NOTIFICATION_PERMISSION_ALIAS
    )
)
public class ScrollShieldNotificationPlugin extends Plugin {
    static final String NOTIFICATION_PERMISSION_ALIAS = "notifications";

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || getPermissionState(NOTIFICATION_PERMISSION_ALIAS) == PermissionState.GRANTED) {
            resolvePermission(call);
            return;
        }

        requestPermissionForAlias(
            NOTIFICATION_PERMISSION_ALIAS,
            call,
            "notificationPermissionCallback"
        );
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        resolvePermission(call);
    }

    private void resolvePermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", ScrollShieldNativePlugin.hasNotificationsEnabled(getContext()));
        call.resolve(result);
    }
}
