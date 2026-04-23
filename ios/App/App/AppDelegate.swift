import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
<<<<<<< HEAD
        // Initialize Firebase (reads GoogleService-Info.plist from the bundle).
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        return true
    }

    // MARK: - APNs registration

    // APNs delivers the raw device token. Hand it to Firebase Messaging so
    // it can mint/refresh the FCM token used by our broadcast-push function.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken

        // Forward to Capacitor so the JS `registration` listener still fires
        // (Capacitor's PushNotifications plugin listens for this notification).
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    // MARK: - Firebase Messaging

    // Fires whenever the FCM token is generated or refreshed. We re-post it
    // through the same Capacitor "registration" channel so the JS layer
    // saves the FCM token (not the raw APNs token) into Supabase.
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        // Capacitor's PushNotifications plugin posts a "registration" event
        // containing the string of `object`. Sending the FCM token here makes
        // iOS behave like Android (where the plugin already returns FCM tokens).
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: fcmToken.data(using: .utf8)
        )
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}
=======
        // Requires GoogleService-Info.plist in the app target (Firebase Console → iOS app).
        FirebaseApp.configure()
        return true
    }

    /// Forwards the FCM registration token to @capacitor/push-notifications (same token type Android uses; required for FCM v1 on the server).
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            if let error = error {
                NotificationCenter.default.post(
                    name: .capacitorDidFailToRegisterForRemoteNotifications,
                    object: error
                )
                return
            }
            guard let token = token, !token.isEmpty else {
                let err = NSError(
                    domain: "AppDelegate",
                    code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "Empty FCM token; check GoogleService-Info.plist and APNs in Firebase Cloud Messaging"]
                )
                NotificationCenter.default.post(
                    name: .capacitorDidFailToRegisterForRemoteNotifications,
                    object: err
                )
                return
            }
            NotificationCenter.default.post(
                name: .capacitorDidRegisterForRemoteNotifications,
                object: token
            )
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }
>>>>>>> 37c2188 (fix(ios): FCM token for push (Firebase, AppDelegate, aps build setting))

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
