package app.scrollshield.mobile

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryPurchasesParams
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Automatically renews native signed Pro grants while protection is running.
 * No browser timers, purchase tokens in React, Firebase secrets in prefs, or
 * indefinite offline paid status. If verification stops, the existing signed
 * grant expires in <=10 minutes and AppMonitorService downgrades to Free.
 *
 * This is best-effort: Android may kill the process and restrict background
 * services. It is NOT a substitute for real Play sandbox/device acceptance.
 */
internal object NativePlayRefreshCoordinator {
    private const val INTERVAL_MS = 4 * 60_000L
    private const val RETRY_MS = 60_000L
    private val running = AtomicBoolean(false)
    private val lastAttemptElapsed = AtomicLong(-1L)
    private val lastSuccessElapsed = AtomicLong(-1L)
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()

    fun resetAfterSignOut() {
        lastAttemptElapsed.set(-1L)
        lastSuccessElapsed.set(-1L)
    }

    fun maybeRefresh(context: Context, force: Boolean = false) {
        val appContext = context.applicationContext
        if (BuildConfig.SCROLLSHIELD_ENTITLEMENT_SPKI.isBlank() ||
            NativeBillingPolicy.normalizedHttpsBase(BuildConfig.SCROLLSHIELD_BILLING_API_URL) == null ||
            NativeBillingIdentity.currentUid(appContext) == null) return

        val now = SystemClock.elapsedRealtime()
        val last = lastAttemptElapsed.get()
        val retryAfter = if (lastSuccessElapsed.get() == last) INTERVAL_MS else RETRY_MS
        if (!force && last >= 0L && now >= last && now - last < retryAfter) return
        if (!running.compareAndSet(false, true)) return
        lastAttemptElapsed.set(now)

        NativeBillingIdentity.getVerifiedIdToken(appContext) { idToken ->
            if (idToken.isNullOrBlank()) {
                running.set(false)
                return@getVerifiedIdToken
            }
            val uidAtStart = NativeBillingIdentity.currentUid(appContext)
            if (uidAtStart == null) {
                running.set(false)
                return@getVerifiedIdToken
            }

            main.post {
                val billingClient = try {
                    BillingClient.newBuilder(appContext)
                        .setListener { _, _ -> /* Observations are non-entitling. */ }
                        .enablePendingPurchases(
                            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
                        )
                        .enableAutoServiceReconnection()
                        .build()
                } catch (_: Exception) {
                    running.set(false)
                    return@post
                }

                try {
                    billingClient.startConnection(object : BillingClientStateListener {
                        override fun onBillingSetupFinished(result: BillingResult) {
                            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                                billingClient.endConnection()
                                running.set(false)
                                return
                            }
                            val params = QueryPurchasesParams.newBuilder()
                                .setProductType(BillingClient.ProductType.SUBS)
                                .includeSuspendedSubscriptions(true)
                                .build()
                            billingClient.queryPurchasesAsync(params) { purchaseResult, purchases ->
                                billingClient.endConnection()
                                if (purchaseResult.responseCode != BillingClient.BillingResponseCode.OK) {
                                    running.set(false)
                                    return@queryPurchasesAsync
                                }
                                val eligible = purchases.filter {
                                    ScrollShieldBillingPlugin.PRODUCT_ID in it.products &&
                                        it.purchaseState == Purchase.PurchaseState.PURCHASED &&
                                        !it.isSuspended &&
                                        NativeBillingPolicy.validPurchaseToken(it.purchaseToken)
                                }.take(10)
                                io.execute {
                                    try {
                                        val transport = NativePlayVerificationTransport(
                                            BuildConfig.SCROLLSHIELD_BILLING_API_URL
                                        )
                                        var newGrant = false
                                        var requestFailed = false
                                        for (purchase in eligible) {
                                            if (NativeBillingIdentity.currentUid(appContext) != uidAtStart) {
                                                requestFailed = true
                                                break
                                            }
                                            try {
                                                val result = transport.verify(idToken, purchase.purchaseToken)
                                                val grant = result.entitlementToken
                                                if (result.active && grant != null &&
                                                    NativeBillingIdentity.currentUid(appContext) == uidAtStart &&
                                                    NativeProEntitlement.install(
                                                        SecurePrefs.open(appContext),
                                                        grant,
                                                        BuildConfig.SCROLLSHIELD_ENTITLEMENT_SPKI,
                                                        uidAtStart,
                                                    )
                                                ) {
                                                    newGrant = true
                                                }
                                            } catch (_: Exception) {
                                                requestFailed = true
                                            }
                                        }
                                        if (NativeBillingIdentity.currentUid(appContext) == uidAtStart) {
                                            if (newGrant) {
                                                lastSuccessElapsed.set(lastAttemptElapsed.get())
                                                AppMonitorService.notifyConfigUpdate(appContext)
                                            } else if (!requestFailed) {
                                                // A successful Play listing with no valid
                                                // paid subscription cancels old cached Pro.
                                                NativeProEntitlement.clear(SecurePrefs.open(appContext))
                                                AppMonitorService.notifyConfigUpdate(appContext)
                                                lastSuccessElapsed.set(lastAttemptElapsed.get())
                                            }
                                            // On network error, the old short-lived signed
                                            // token expires normally; NEVER extend locally.
                                        }
                                    } finally {
                                        running.set(false)
                                    }
                                }
                            }
                        }
                        override fun onBillingServiceDisconnected() {
                            // SDK reconnects on a new attempt after throttle.
                            running.set(false)
                        }
                    })
                } catch (_: Exception) {
                    billingClient.endConnection()
                    running.set(false)
                }
            }
        }
    }
}
