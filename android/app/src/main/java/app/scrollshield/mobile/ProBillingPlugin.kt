package app.scrollshield.mobile

import android.content.Intent
import android.net.Uri
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClient.BillingResponseCode
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * ScrollShield Pro over Google Play Billing, with Google's own library and no
 * third-party service: payment data stays with Google Play, ScrollShield only
 * learns whether the subscription is active.
 *
 * One subscription PRODUCT_ID with the base plans "yearly" and "monthly", set
 * up in the Play Console. The 7 free days are an offer on "yearly"; Google
 * Play only returns it to users who may still get it.
 *
 * The phone trusts the purchase state Google Play reports; no server checks
 * it. Purchases are acknowledged here – unacknowledged ones Google refunds
 * after three days.
 */
@CapacitorPlugin(name = "ScrollShieldBilling")
class ProBillingPlugin : Plugin(), PurchasesUpdatedListener {

    companion object {
        const val PRODUCT_ID = "pro"
    }

    private lateinit var client: BillingClient

    /** The product as Google Play last described it; needed to start a purchase. */
    @Volatile
    private var productDetails: ProductDetails? = null

    /** The purchase call waiting for onPurchasesUpdated. */
    @Volatile
    private var pendingPurchaseCall: PluginCall? = null

    override fun load() {
        client = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build()
    }

    override fun handleOnDestroy() {
        if (::client.isInitialized) client.endConnection()
    }

    /** Runs `block` once Google Play billing is connected, `onUnavailable` when it is not there. */
    private fun withClient(onUnavailable: () -> Unit, block: () -> Unit) {
        if (client.isReady) {
            block()
            return
        }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingResponseCode.OK) block() else onUnavailable()
            }

            override fun onBillingServiceDisconnected() {
                // enableAutoServiceReconnection() reconnects on the next call.
            }
        })
    }

    /**
     * Whether Pro is active. `available: false` means Google Play could not
     * answer (no Play Store, offline, not signed in); the app then keeps what
     * it knew.
     */
    @PluginMethod
    fun getStatus(call: PluginCall) {
        withClient({ call.resolve(statusResult(available = false, active = false)) }) {
            val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()
            client.queryPurchasesAsync(params) { result, purchases ->
                if (result.responseCode != BillingResponseCode.OK) {
                    call.resolve(statusResult(available = false, active = false))
                    return@queryPurchasesAsync
                }
                val pro = purchases.filter { isPurchasedPro(it) }
                pro.filterNot { it.isAcknowledged }.forEach { acknowledge(it) }
                call.resolve(statusResult(available = true, active = pro.isNotEmpty()))
            }
        }
    }

    /**
     * The plans with the prices Google Play shows this user, in their
     * currency: one entry per base plan, with the free trial if the user may
     * still get it.
     */
    @PluginMethod
    fun getPlans(call: PluginCall) {
        withClient({ call.resolve(JSObject().put("plans", JSArray())) }) {
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    listOf(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(PRODUCT_ID)
                            .setProductType(BillingClient.ProductType.SUBS)
                            .build(),
                    ),
                )
                .build()
            client.queryProductDetailsAsync(params) { result, details ->
                val product = if (result.responseCode == BillingResponseCode.OK) {
                    details.productDetailsList.firstOrNull()
                } else {
                    null
                }
                productDetails = product

                val plans = JSArray()
                product?.subscriptionOfferDetails
                    ?.map { it.basePlanId }
                    ?.distinct()
                    ?.forEach { basePlanId ->
                        val offer = bestOffer(product, basePlanId) ?: return@forEach
                        val phases = offer.pricingPhases.pricingPhaseList
                        val recurring = phases.last()
                        val plan = JSObject()
                            .put("basePlanId", basePlanId)
                            .put("price", recurring.formattedPrice)
                            .put("billingPeriod", recurring.billingPeriod)
                        phases.firstOrNull { it.priceAmountMicros == 0L }?.let { plan.put("freeTrialPeriod", it.billingPeriod) }
                        plans.put(plan)
                    }
                call.resolve(JSObject().put("plans", plans))
            }
        }
    }

    /**
     * Opens Google Play's purchase sheet for a base plan. Resolves with
     * "purchased", "pending" (payment not confirmed yet), "cancelled",
     * "unavailable" or "error".
     */
    @PluginMethod
    fun purchase(call: PluginCall) {
        val basePlanId = call.getString("basePlanId")
        val product = productDetails
        val offer = if (basePlanId != null && product != null) bestOffer(product, basePlanId) else null
        val activity = activity
        if (product == null || offer == null || activity == null) {
            call.resolve(purchaseResult("unavailable"))
            return
        }

        withClient({ call.resolve(purchaseResult("unavailable")) }) {
            val params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(
                    listOf(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(product)
                            .setOfferToken(offer.offerToken)
                            .build(),
                    ),
                )
                .build()
            activity.runOnUiThread {
                pendingPurchaseCall?.resolve(purchaseResult("cancelled"))
                pendingPurchaseCall = call
                val result = client.launchBillingFlow(activity, params)
                if (result.responseCode != BillingResponseCode.OK) {
                    pendingPurchaseCall = null
                    call.resolve(purchaseResult("error", result.responseCode))
                }
            }
        }
    }

    /** Google Play's subscription page for ScrollShield: change plan, pay, cancel. */
    @PluginMethod
    fun manage(call: PluginCall) {
        val uri = Uri.parse(
            "https://play.google.com/store/account/subscriptions?sku=$PRODUCT_ID&package=${context.packageName}"
        )
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            call.resolve()
        } catch (_: Exception) {
            call.reject("Google Play could not be opened")
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingPurchaseCall
        pendingPurchaseCall = null
        val pro = purchases.orEmpty().filter { PRODUCT_ID in it.products }
        pro.filter { isPurchasedPro(it) && !it.isAcknowledged }.forEach { acknowledge(it) }

        val status = when (result.responseCode) {
            BillingResponseCode.OK -> when {
                pro.any { isPurchasedPro(it) } -> "purchased"
                pro.any { it.purchaseState == Purchase.PurchaseState.PENDING } -> "pending"
                else -> "error"
            }
            BillingResponseCode.ITEM_ALREADY_OWNED -> "purchased"
            BillingResponseCode.USER_CANCELED -> "cancelled"
            else -> "error"
        }
        call?.resolve(purchaseResult(status, result.responseCode))
    }

    /** The offer with free days if Google Play offers this user one, otherwise the plain base plan. */
    private fun bestOffer(product: ProductDetails, basePlanId: String): ProductDetails.SubscriptionOfferDetails? {
        val offers = product.subscriptionOfferDetails?.filter { it.basePlanId == basePlanId }.orEmpty()
        return offers.firstOrNull { offer ->
            offer.pricingPhases.pricingPhaseList.any { it.priceAmountMicros == 0L }
        } ?: offers.firstOrNull { it.offerId == null } ?: offers.firstOrNull()
    }

    private fun isPurchasedPro(purchase: Purchase) =
        purchase.purchaseState == Purchase.PurchaseState.PURCHASED && PRODUCT_ID in purchase.products

    private fun acknowledge(purchase: Purchase) {
        val params = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()
        client.acknowledgePurchase(params) { /* Retried by the next getStatus(). */ }
    }

    private fun statusResult(available: Boolean, active: Boolean) =
        JSObject().put("available", available).put("active", active)

    private fun purchaseResult(status: String, code: Int? = null) =
        JSObject().put("status", status).apply { if (code != null) put("code", code) }
}
