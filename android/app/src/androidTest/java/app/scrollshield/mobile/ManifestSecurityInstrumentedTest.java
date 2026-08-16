package app.scrollshield.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ReceiverInfo;
import android.content.pm.ServiceInfo;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@RunWith(AndroidJUnit4.class)
public class ManifestSecurityInstrumentedTest {
    private static final Set<String> EXPECTED_PERMISSIONS = new HashSet<>(Arrays.asList(
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.PACKAGE_USAGE_STATS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_SPECIAL_USE"
    ));

    @Test
    public void mergedManifestContainsOnlyReviewedPermissions() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        PackageManager packageManager = context.getPackageManager();
        PackageInfo packageInfo = packageManager.getPackageInfo(
            context.getPackageName(),
            PackageManager.GET_PERMISSIONS
        );

        Set<String> actualPermissions = new HashSet<>();
        if (packageInfo.requestedPermissions != null) {
            actualPermissions.addAll(Arrays.asList(packageInfo.requestedPermissions));
        }

        assertFalse("Offline-first v1 must not request INTERNET", actualPermissions.contains("android.permission.INTERNET"));
        assertTrue("Merged manifest is missing reviewed permissions: " + actualPermissions, actualPermissions.containsAll(EXPECTED_PERMISSIONS));
        assertTrue("Merged manifest contains unreviewed permissions: " + actualPermissions, EXPECTED_PERMISSIONS.containsAll(actualPermissions));
    }

    @Test
    public void applicationBackupRemainsDisabled() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ApplicationInfo applicationInfo = context.getPackageManager().getApplicationInfo(context.getPackageName(), 0);
        assertFalse(
            "Android backup must remain disabled for local ScrollShield state",
            (applicationInfo.flags & ApplicationInfo.FLAG_ALLOW_BACKUP) != 0
        );
    }

    @Test
    public void protectionServiceIsRegisteredAndNotExported() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ComponentName service = new ComponentName(context, ScrollShieldProtectionService.class);
        ServiceInfo serviceInfo = context.getPackageManager().getServiceInfo(service, 0);

        assertNotNull(serviceInfo);
        assertFalse("Protection service must not be callable by other apps", serviceInfo.exported);
        assertTrue("Protection service must remain enabled", serviceInfo.enabled);
    }

    @Test
    public void bootReceiverIsExplicitlyRegisteredForSystemRecovery() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ComponentName receiver = new ComponentName(context, ScrollShieldBootReceiver.class);
        ReceiverInfo receiverInfo = context.getPackageManager().getReceiverInfo(receiver, 0);

        assertNotNull(receiverInfo);
        assertTrue("Boot receiver must remain enabled for opted-in recovery", receiverInfo.enabled);
        assertTrue("Boot receiver must remain exported so Android can deliver system recovery broadcasts", receiverInfo.exported);
    }
}
