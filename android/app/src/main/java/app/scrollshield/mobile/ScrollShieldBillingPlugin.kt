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

    // This is an observation/restore foundation, NOT the payment flow.
    // No server => no verification; native Pro remains Free in production.
    private val backendHandler = Handler(Looper.getMainLooper())
    private val verificationExecutor = Executors.newSingleThreadExecutor()

    @PluginMethod
    fun getVerificationReadiness(call: PluginCall) {
        call.resolve(
            JSObject().put(
                "configured",
                NativeBillingPolicy.normalizedHttpsBase(BuildConfig.SCROLLSHIELD_BILLING_API_URL) != null &&
                    BuildConfig.SCROLLSHIELD_ENTITLEMENT_SPKI.isNotEmpty()
            )
        )
    }

    /**
     * A signed token is readable only by the native layer. This UI-facing
     * status is not itself an entitlement, so no user-controllable pro flag.
     */
    @PluginMethod
    fun getNativeProStatus(call: PluginCall) {
        val active = NativeProEntitlement.isActive(
            SecurePrefs.open(context), BuildConfig.SCROLLSHIELD_ENTITLEMENT_SPKI,
            NativeBillingIdentity.currentUid(context)
        )
        call.resolve(JSObject().put("verified", active))
    }

    /** Call on sign-out, account change or explicit user data removal. */
    @PluginMethod
    fun clearVerifiedPro(call: PluginCall) {
        val success = NativeProEntitlement.clear(SecurePrefs.open(context))
        if (success) AppMonitorService.notifyConfigUpdate(context)
        call.resolve(JSObject().put("cleared", success))
    }

    /**
     * Returns a non-secret account binding for a FUTURE BillingFlowParams.
     * Caller must obtain a Firebase Auth ID token from the planned sign-in UX.
     * The backend validates the Firebase signature before issuing this ID.
     */
    @PluginMethod
    fun getVerifiedAccountBinding(call: PluginCall) {
        val firebaseIdToken = call.getString("firebaseIdToken")
        if (!NativeBillingPolicy.canBeginVerification(
                firebaseIdToken, BuildConfig.SCROLLSHIELD_BILLING_API_URL
            )
        ) {
            call.reject("Firebase-Anmeldung oder Kaufprüfung fehlt.", "BILLING_NOT_CONFIGURED")
            return
        }
        verificationExecutor.execute {
            try {
                val id = NativePlayVerificationTransport(BuildConfig.SCROLLSHIELD_BILLING_API_URL)
                    .accountBinding(firebaseIdToken!!)
                backendHandler.post {
                    call.resolve(JSObject().put("obfuscatedAccountId", id))
                }
            } catch (_: Exception) {
                backendHandler.post {
                    call.reject("Play-Konto konnte nicht sicher verbunden werden.", "BILLING_IDENTITY_FAILED")
                }
            }
        }
    }

    /**
     * Observe owned subscriptions and verify every PURCHASED, non-suspended
     * purchase directly native -> backend. Never return purchase tokens or
     * issue entitlements / acknowledge purchases. A server response alone
     * is not yet wired to enforce paid features in the native monitor.
     */
    @PluginMethod
    fun verifyExistingPurchases(call: PluginCall) {
        val firebaseIdToken = call.getString("firebaseIdToken")
        if (!NativeBillingPolicy.canBeginVerification(
                firebaseIdToken, BuildConfig.SCROLLSHIELD_BILLING_API_URL
            )
        ) {
            call.reject("Firebase-Anmeldung oder Kaufprüfung fehlt.", "BILLING_NOT_CONFIGURED")
            return
        }

        connected(call) { client ->
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .includeSuspendedSubscriptions(true)
                .build()
            client.queryPurchasesAsync(params) { result, purchases ->
                client.endConnection()
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    call.reject("Bestehende Google-Play-Abos nicht abrufbar.", "BILLING_RESTORE_FAILED")
                    return@queryPurchasesAsync
                }

                // Snapshot only package-owned purchases, never WebView-visible.
                val eligible = purchases.filter {
                    PRODUCT_ID in it.products &&
                        it.purchaseState == Purchase.PurchaseState.PURCHASED &&
                        !it.isSuspended &&
                        NativeBillingPolicy.validPurchaseToken(it.purchaseToken)
                }.take(10)
                val pendingCount = purchases.count {
                    PRODUCT_ID in it.products && it.purchaseState == Purchase.PurchaseState.PENDING
                }
                verificationExecutor.execute {
                    try {
                        val transport = NativePlayVerificationTransport(BuildConfig.SCROLLSHIELD_BILLING_API_URL)
                        var verifiedActive = 0
                        var verifiedInactive = 0
                        var rejected = 0
                        var installedSignedEntitlement = false
                        for (purchase in eligible) {
                            try {
                                val status = transport.verify(firebaseIdToken!!, purchase.purchaseToken)
                                if (status.active) {
                                    val grant = status.entitlementToken
                                    val saved = grant != null && NativeProEntitlement.install(
                                        SecurePrefs.open(context),
                                        grant,
                                        BuildConfig.SCROLLSHIELD_ENTITLEMENT_SPKI,
                                        NativeBillingIdentity.currentUid(context),
                                    )
                                    if (saved) {
                                        verifiedActive++
                                        installedSignedEntitlement = true
                                    } else {
                                        // Signed response absent, invalid, expired or signing
                                        // key not configured -> Free, never silent Pro.
                                        rejected++
                                    }
                                } else {
                                    verifiedInactive++
                                }
                            } catch (_: Exception) {
                                // No offline/cached Pro; an unreachable backend is a failure.
                                rejected++
                            }
                        }
                        backendHandler.post {
                            if (installedSignedEntitlement) {
                                // Reload rules on the worker/service: verified signature
                                // is the ONLY native switch from Free to Pro.
                                AppMonitorService.notifyConfigUpdate(context)
                            }
                            call.resolve(
                                JSObject()
                                    .put("available", true)
                                    .put("verifiedActiveObservations", verifiedActive)
                                    .put("verifiedInactiveObservations", verifiedInactive)
                                    .put("pendingPurchases", pendingCount)
                                    .put("verificationFailures", rejected)
                                    .put("nativeProVerified", installedSignedEntitlement)
                                    // React's product UI is not yet integrated with
                                    // user login; do not claim paid UI is enabled.
                                    .put("proActivated", false)
                            )
                        }
                    } catch (_: Exception) {
                        backendHandler.post {
                            call.reject("Abo-Prüfung nicht verfügbar.", "BILLING_VERIFICATION_FAILED")
                        }
                    }
                }
            }
        }
    }


    /**
     * Preflight ONLY: authenticate against our server and query a FRESH Play
     * offer that Google says this user is eligible to buy. No launchBillingFlow
     * until user sign-in, restore, acknowledgment and enforceable native Pro
     * entitlements are released together. The offerToken never reaches React.
     */
    @PluginMethod
    fun prepareVerifiedCheckout(call: PluginCall) {
        val firebaseIdToken = call.getString("firebaseIdToken")
        val basePlanId = call.getString("basePlanId") ?: ""
        val offerId = call.getString("offerId")
        if (!NativeBillingPolicy.validBasePlan(basePlanId) ||
            !NativeBillingPolicy.validOfferId(offerId)) {
            call.reject("Ungültiger Google-Play-Tarif.", "BILLING_INVALID_PLAN")
            return
        }
        if (!NativeBillingPolicy.canBeginVerification(
                firebaseIdToken, BuildConfig.SCROLLSHIELD_BILLING_API_URL
            )
        ) {
            call.reject("Kauf noch nicht bereit: Anmeldung/Backend fehlt.", "BILLING_NOT_CONFIGURED")
            return
        }

        verificationExecutor.execute {
            val authenticated = try {
                // The server verifies the JWT and returns a stable HMAC binding.
                NativePlayVerificationTransport(BuildConfig.SCROLLSHIELD_BILLING_API_URL)
                    .accountBinding(firebaseIdToken!!)
            } catch (_: Exception) {
                null
            }

            backendHandler.post {
                if (authenticated == null) {
                    call.reject("Google-Play-Konto nicht überprüfbar.", "BILLING_IDENTITY_FAILED")
                    return@post
                }

                connected(call) { client ->
                    val product = QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_ID)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                    val params = QueryProductDetailsParams.newBuilder()
                        .setProductList(listOf(product))
                        .build()
                    client.queryProductDetailsAsync(params) { result, details ->
                        try {
                            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                                call.reject("Google Play-Angebote sind nicht verfügbar.", "BILLING_CATALOG_FAILED")
                                return@queryProductDetailsAsync
                            }
                            val eligible = details.productDetailsList
                                .filter { it.productId == PRODUCT_ID }
                                .flatMap { it.subscriptionOfferDetails.orEmpty() }
                                .firstOrNull { it.basePlanId == basePlanId && it.offerId == offerId }

                            if (eligible == null) {
                                call.reject("Dieses Angebot ist derzeit nicht verfügbar.", "BILLING_OFFER_NOT_ELIGIBLE")
                                return@queryProductDetailsAsync
                            }
                            // No actual purchase/entitlement is possible here.
                            call.resolve(
                                JSObject()
                                    .put("readyForFutureCheckout", true)
                                    .put("checkoutEnabled", false)
                                    .put("basePlanId", basePlanId)
                                    .put("serverIdentityVerified", true)
                            )
                        } catch (_: Exception) {
                            call.reject("Google-Play-Angebot konnte nicht geprüft werden.", "BILLING_CATALOG_FAILED")
                        } finally {
                            client.endConnection()
                        }
                    }
                }
            }
        }
    }

}
