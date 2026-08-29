package app.scrollshield.mobile;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.List;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScrollShieldBilling")
public class ScrollShieldBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private interface ReadyAction {
        void run(BillingClient client);
    }

    private static final class PendingReadyAction {
        final PluginCall call;
        final ReadyAction action;

        PendingReadyAction(PluginCall call, ReadyAction action) {
            this.call = call;
            this.action = action;
        }
    }

    private final Object billingLock = new Object();
    private final List<PendingReadyAction> pendingReadyActions = new ArrayList<>();
    private BillingClient billingClient;
    private boolean connectionInFlight = false;

    @PluginMethod
    public void getConnectionStatus(PluginCall call) {
        BillingClient client;
        synchronized (billingLock) {
            client = billingClient;
        }

        JSObject result = new JSObject();
        result.put("ready", client != null && client.isReady());
        result.put("connectionState", client == null
            ? BillingClient.ConnectionState.DISCONNECTED
            : client.getConnectionState());
        call.resolve(result);
    }

    /**
     * Read-only restore/status query.
     *
     * This method intentionally does NOT grant an entitlement and does NOT acknowledge
     * a purchase. Returned purchase tokens are transport material for the secure backend
     * verifier and must not be persisted as a local paid-access flag.
     */
    @PluginMethod
    public void querySubscriptionPurchases(PluginCall call) {
        withReadyClient(call, client -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .includeSuspendedSubscriptions(true)
                .build();

            client.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    rejectBilling(call, "querySubscriptionPurchases", billingResult);
                    return;
                }

                JSObject result = new JSObject();
                result.put("purchases", purchasesToJson(purchases));
                result.put("responseCode", billingResult.getResponseCode());
                call.resolve(result);
            });
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        JSObject event = new JSObject();
        event.put("responseCode", billingResult.getResponseCode());
        event.put("hasPurchases", purchases != null && !purchases.isEmpty());
        event.put("requiresSecureRequery", true);

        // Never expose a client-side "paid=true" event. The JS layer must explicitly
        // re-query purchases and send purchase tokens to the secure backend verifier.
        notifyListeners("purchaseStateChanged", event, true);
    }

    private void withReadyClient(PluginCall call, ReadyAction action) {
        BillingClient readyClient;
        synchronized (billingLock) {
            readyClient = billingClient;
            if (readyClient != null && readyClient.isReady()) {
                // Run after releasing the lock below.
            } else {
                pendingReadyActions.add(new PendingReadyAction(call, action));
                if (!connectionInFlight) {
                    connectionInFlight = true;
                    if (billingClient == null) {
                        billingClient = createBillingClient();
                    }
                    billingClient.startConnection(new BillingClientStateListener() {
                        @Override
                        public void onBillingSetupFinished(BillingResult billingResult) {
                            handleSetupFinished(billingResult);
                        }

                        @Override
                        public void onBillingServiceDisconnected() {
                            synchronized (billingLock) {
                                connectionInFlight = false;
                            }
                        }
                    });
                }
                return;
            }
        }

        action.run(readyClient);
    }

    private BillingClient createBillingClient() {
        PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .enablePrepaidPlans()
            .build();

        return BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(pendingPurchasesParams)
            .enableAutoServiceReconnection()
            .build();
    }

    private void handleSetupFinished(BillingResult billingResult) {
        List<PendingReadyAction> pending;
        BillingClient client;

        synchronized (billingLock) {
            connectionInFlight = false;
            client = billingClient;
            pending = new ArrayList<>(pendingReadyActions);
            pendingReadyActions.clear();
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK
            || client == null
            || !client.isReady()) {
            for (PendingReadyAction item : pending) {
                rejectBilling(item.call, "billingSetup", billingResult);
            }
            return;
        }

        for (PendingReadyAction item : pending) {
            item.action.run(client);
        }
    }

    private JSONArray purchasesToJson(List<Purchase> purchases) {
        JSONArray result = new JSONArray();
        if (purchases == null) return result;

        for (Purchase purchase : purchases) {
            JSObject item = new JSObject();
            item.put("purchaseToken", purchase.getPurchaseToken());
            item.put("products", new JSONArray(purchase.getProducts()));
            item.put("purchaseState", purchaseStateName(purchase.getPurchaseState()));
            item.put("acknowledged", purchase.isAcknowledged());
            item.put("autoRenewing", purchase.isAutoRenewing());
            item.put("purchaseTimeMs", purchase.getPurchaseTime());
            result.put(item);
        }
        return result;
    }

    private String purchaseStateName(int purchaseState) {
        if (purchaseState == Purchase.PurchaseState.PURCHASED) return "purchased";
        if (purchaseState == Purchase.PurchaseState.PENDING) return "pending";
        return "unspecified";
    }

    private void rejectBilling(PluginCall call, String operation, BillingResult result) {
        call.reject(
            operation + " failed with Google Play Billing response code " + result.getResponseCode()
        );
    }
}
