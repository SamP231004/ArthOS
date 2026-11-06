package expo.modules.arthosocr

import android.net.Uri
import com.google.mlkit.common.sdkinternal.MlKitContext
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * On-device OCR with Google ML Kit's bundled Latin text recogniser. Accepts content://, file:// or a plain path.
 * ML Kit is initialised explicitly: when its init provider hasn't run, getClient() fails with an opaque
 * "getClass() on a null object reference" (what the previous library hit).
 */
class ArthosOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ArthosOcr")

    AsyncFunction("recognize") { uriString: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(CodedException("OCR_NO_CONTEXT", "App context isn't ready yet", null))
        return@AsyncFunction
      }
      try {
        MlKitContext.initializeIfNeeded(context.applicationContext)
        val uri = when {
          uriString.startsWith("content://") || uriString.startsWith("file://") -> Uri.parse(uriString)
          else -> Uri.fromFile(File(uriString))
        }
        val image = InputImage.fromFilePath(context, uri)
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        recognizer.process(image)
          .addOnSuccessListener { result ->
            promise.resolve(result.text)
            recognizer.close()
          }
          .addOnFailureListener { e ->
            promise.reject(CodedException("OCR_FAILED", e.message ?: e.javaClass.simpleName, e))
            recognizer.close()
          }
      } catch (e: Throwable) {
        promise.reject(CodedException("OCR_FAILED", e.message ?: e.javaClass.simpleName, e))
      }
    }
  }
}
