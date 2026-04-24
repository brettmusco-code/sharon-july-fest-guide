import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// Set when `GoogleService-Info.plist` is present in the app bundle and Firebase started.
    private var isFirebaseConfigured = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if hasGoogleServicePlist {
            FirebaseApp.configure()
            isFirebaseConfigured = true
        } else {
            // Plist is gitignored; add it from Firebase Console and include it in the App target, or the app will run without FCM / push.
            print("[App] GoogleService-Info.plist not in bundle — skipping Firebase. Add the file to the App target for push (see ios/.gitignore note).")
        }
        return true
    }

    private var hasGoogleServicePlist: Bool {
        Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil
    }

    /// APNs → FCM string → Capacitor (same long token as Android; required for FCM v1 in broadcast-push).
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        guard isFirebaseConfigured else {
            let err = NSError(
                domain: "AppDelegate",
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "Add GoogleService-Info.plist to the App target (from Firebase Console) to enable FCM push."]
            )
            NotificationCenter.default.post(
                name: .capacitorDidFailToRegisterForRemoteNotifications,
                object: err
            )
            return
        }
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

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
