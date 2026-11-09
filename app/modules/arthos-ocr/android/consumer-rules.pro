# Release builds are minified (android.enableMinifyInReleaseBuilds=true). R8 was renaming/stripping ML Kit's
# reflection-loaded components, so recognition failed with "getClass() on a null object reference".
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_bundled_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_common.** { *; }
-keep class com.google.firebase.components.** { *; }
-keep class * implements com.google.firebase.components.ComponentRegistrar { *; }
-keep class expo.modules.arthosocr.** { *; }
-dontwarn com.google.mlkit.**

# PDFBox (CAS import): resources and fonts are loaded by name
-keep class com.tom_roush.pdfbox.** { *; }
-keep class com.tom_roush.fontbox.** { *; }
-keep class com.tom_roush.harmony.** { *; }
-dontwarn com.gemalto.jp2.**
-dontwarn com.tom_roush.pdfbox.filter.JPXFilter
