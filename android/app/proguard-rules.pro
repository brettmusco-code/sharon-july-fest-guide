# Capacitor / WebView — keep native bridge and Cordova entry points from R8 stripping.
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# Firebase Cloud Messaging (when google-services.json is present)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
