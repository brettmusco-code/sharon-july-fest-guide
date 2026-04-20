# Capacitor / WebView — keep native bridge and Cordova entry points from R8 stripping.
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**
