package expo.modules.arthosocr

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.net.Uri
import com.google.mlkit.common.sdkinternal.MlKitContext
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.pdmodel.encryption.InvalidPasswordException
import com.tom_roush.pdfbox.text.PDFTextStripper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileInputStream
import java.io.IOException
import java.io.InputStream

/**
 * On-device OCR with Google ML Kit's bundled Latin text recogniser.
 *
 * The image is decoded here (not with ML Kit's InputImage.fromFilePath, which failed on some phones with an opaque
 * "getClass() on a null object reference"): it accepts content://, file:/ and file:/// URIs and plain paths, scales big
 * images down (OCR doesn't need 4000px), applies the EXIF rotation, and hands ML Kit a ready bitmap. Failures report
 * the exception type and where it happened, so a problem on a device can be diagnosed from the message.
 */
class ArthosOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ArthosOcr")

    AsyncFunction("recognize") { uriString: String, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.reject(CodedException("OCR_NO_CONTEXT", "App context isn't ready yet", null))
        return@AsyncFunction
      }
      try {
        try {
          MlKitContext.initializeIfNeeded(context)
        } catch (_: Throwable) {
          // already initialised by ML Kit's own provider, or not needed
        }
        val bitmap = decode(context, uriString)
        val image = InputImage.fromBitmap(bitmap, rotation(context, uriString))
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        recognizer.process(image)
          .addOnSuccessListener { result ->
            promise.resolve(result.text)
            recognizer.close()
          }
          .addOnFailureListener { e ->
            promise.reject(CodedException("OCR_FAILED", describe(e), e))
            recognizer.close()
          }
      } catch (e: Throwable) {
        promise.reject(CodedException("OCR_FAILED", describe(e), e))
      }
    }

    /**
     * Text of a (password-protected) PDF, e.g. a CAMS/KFintech CAS, extracted on the device with PDFBox. The file
     * never leaves the phone; lines are sorted by position so statement rows read left to right.
     */
    AsyncFunction("pdfText") { uriString: String, password: String?, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) {
        promise.reject(CodedException("PDF_NO_CONTEXT", "App context isn't ready yet", null))
        return@AsyncFunction
      }
      try {
        PDFBoxResourceLoader.init(context)
        open(context, uriString).use { input ->
          val doc = try {
            PDDocument.load(input, password ?: "")
          } catch (e: InvalidPasswordException) {
            val code = if (password.isNullOrEmpty()) "PDF_PASSWORD_REQUIRED" else "PDF_PASSWORD_WRONG"
            promise.reject(CodedException(code, if (password.isNullOrEmpty()) "This PDF is password-protected." else "That password didn't open the PDF.", e))
            return@AsyncFunction
          }
          doc.use {
            val stripper = PDFTextStripper()
            stripper.sortByPosition = true
            promise.resolve(stripper.getText(it))
          }
        }
      } catch (e: Throwable) {
        promise.reject(CodedException("PDF_FAILED", describe(e), e))
      }
    }
  }

  private fun open(context: Context, s: String): InputStream = when {
    s.startsWith("content://") -> context.contentResolver.openInputStream(Uri.parse(s)) ?: throw IOException("Can't open the shared image")
    s.startsWith("file:") -> FileInputStream(File(Uri.parse(s).path ?: s.removePrefix("file://").removePrefix("file:")))
    else -> FileInputStream(File(s))
  }

  /** Decode with downsampling so the longest side is at most ~2400px (plenty for text, light on memory). */
  private fun decode(context: Context, s: String): Bitmap {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    open(context, s).use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IOException("That file isn't an image this phone can read (${bounds.outMimeType ?: "unknown type"})")
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= 2400) sample *= 2
    val opts = BitmapFactory.Options().apply {
      inSampleSize = sample
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    return open(context, s).use { BitmapFactory.decodeStream(it, null, opts) } ?: throw IOException("Couldn't decode the image")
  }

  /** EXIF orientation in degrees (photos from the camera are often stored sideways). */
  private fun rotation(context: Context, s: String): Int = try {
    open(context, s).use {
      when (ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90
        ExifInterface.ORIENTATION_ROTATE_180 -> 180
        ExifInterface.ORIENTATION_ROTATE_270 -> 270
        else -> 0
      }
    }
  } catch (_: Throwable) {
    0
  }

  private fun describe(e: Throwable): String {
    val where = e.stackTrace.take(3).joinToString(" < ") { "${it.className.substringAfterLast('.')}.${it.methodName}:${it.lineNumber}" }
    return "${e.javaClass.simpleName}: ${e.message ?: "no message"}" + if (where.isNotEmpty()) " @ $where" else ""
  }
}
