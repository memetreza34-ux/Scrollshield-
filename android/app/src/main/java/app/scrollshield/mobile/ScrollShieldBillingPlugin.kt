package app.scrollshield.mobile

import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod

/**
 * Read-only Play Billing transport for V1.
 *
 * Product details and purchase states come from Google Play, never from local
 * storage. None of this data is trusted as an entitlement. The native plugin
 * deliberately has NO purchase-launching or Pro-unlocking method until a
 * server verifies purchase tokens using purchases.subscriptionsv2.get.
 *
 * The Play Console product ID and its base plans must match docs/BILLING_SETUP.md.
 */
@CapacitorPlugin(name = "ScrollShieldBilling")
class ScrollShieldBillingPlugin : Plugin() {
    companion object {
        const val PRODUCT_ID = "scrollshield_pro"
        private val ALLOWED_BASE_PLANS = setOf("monthly", "annual")
    }

    private fun newBillingClient(): BillingClient =
        BillingClient.newBuilder(context)
            .setListener { _, _ ->
                // PurchasesUpdatedListener is intentionally non-entitling.
                // Future purchase flow must verify against the secure backend.
            }
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .enableAutoServiceReconnection()
            .build()

    private fun connected(call: PluginCall, action: (BillingClient) -> Unit) {
        val client = try {
            newBillingClient()
        } catch (_: Exception) {
            call.reject("Google Play Billing konnte nicht initialisiert werden.", "BILLING_INIT_FAILED")
            return
        }
        try {
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) {
                    if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                        client.endConnection()
                        call.reject("Google Play Billing ist nicht verfügbar.", "BILLING_UNAVAILABLE")
                        return
                    }
                    try {
                        action(client)
                    } catch (_: Exception) {
                        client.endConnection()
                        call.reject("Die Anfrage an Google Play ist fehlgeschlagen.", "BILLING_QUERY_FAILED")
                    }
                }

                override fun onBillingServiceDisconnected() {
                    // Each read request is short-lived. Next foreground action
                    // creates a new client; never assume stale purchase data.
                }
            })
        } catch (_: Exception) {
            client.endConnection()
            call.reject("Verbindung zum Play Store fehlgeschlagen.", "BILLING_CONNECTION_FAILED")
        }
    }

    /** Real locale-specific offers from the configured Play subscription. */
    @PluginMethod
    fun getCatalog(call: PluginCall) {
        connected(call) { client ->
            val item = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(listOf(item))
                .build()

            client.queryProductDetailsAsync(params) { result, details ->
                try {
                    if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                        call.reject("Google Play konnte die Preise nicht laden.", "BILLING_CATALOG_FAILED")
                        return@queryProductDetailsAsync
                    }

                    val plans = JSArray()
                    for (product in details.productDetailsList) {
                        if (product.productId != PRODUCT_ID) continue
                        for (offer in product.subscriptionOfferDetails.orEmpty()) {
                            if (offer.basePlanId !in ALLOWED_BASE_PLANS) continue
                            val phases = JSArray()
                            for (phase in offer.pricingPhases.pricingPhaseList) {
                                phases.put(
                                    JSObject()
                                        .put("formattedPrice", phase.formattedPrice)
                                        .put("billingPeriod", phase.billingPeriod)
                                        .put("billingCycleCount", phase.billingCycleCount)
                                        .put("recurrenceMode", phase.recurrenceMode)
                                        .put("isFree", phase.priceAmountMicros == 0L)
                                )
                            }
                            val offerData = JSObject()
                                .put("productId", product.productId)
                                .put("basePlanId", offer.basePlanId)
                                .put("title", product.title)
                                .put("description", product.description)
                                .put("phases", phases)
                            offer.offerId?.let { offerData.put("offerId", it) }
                            plans.put(offerData)
                        }
                    }
                    call.resolve(JSObject().put("available", true).put("plans", plans))
                } catch (_: Exception) {
                    call.reject("Google Play-Angebote konnten nicht verarbeitet werden.", "BILLING_CATALOG_FAILED")
                } finally {
                    client.endConnection()
                }
            }
        }
    }

    /**
     * Useful for a future restore flow, but NEVER proof of active Pro.
     * Google Play purchase tokens and originalJson are not sent to the WebView.
     * Suspended, pending, canceled and expired cases require backend checks.
     */
    @PluginMethod
    fun getPurchaseOverview(call: PluginCall) {
        connected(call) { client ->
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .includeSuspendedSubscriptions(true)
                .build()
            client.queryPurchasesAsync(params) { result, purchases ->
                try {
                    if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                        call.reject("Google Play konnte Käufe nicht abrufen.", "BILLING_RESTORE_FAILED")
                        return@queryPurchasesAsync
                    }
                    val entries = JSArray()
                    for (purchase in purchases) {
                        if (PRODUCT_ID !in purchase.products) continue
                        val status = when (purchase.purchaseState) {
                            Purchase.PurchaseState.PURCHASED -> "purchased_unverified"
                            Purchase.PurchaseState.PENDING -> "pending"
                            else -> "unknown"
                        }
                        entries.put(
                            JSObject()
                                .put("state", if (purchase.isSuspended) "suspended" else status)
                                .put("acknowledged", purchase.isAcknowledged)
                        )
                    }
                    call.resolve(JSObject().put("available", true).put("purchases", entries))
                } catch (_: Exception) {
                    call.reject("Kaufstatus konnte nicht verarbeitet werden.", "BILLING_RESTORE_FAILED")
                } finally {
                    client.endConnection()
                }
            }
        }
    }
}
