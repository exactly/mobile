package expo.modules.webauthn

import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPasswordOption
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

@Suppress("unused")
class ExpoWebauthn : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoWebauthn")

    AsyncFunction("create") Coroutine { requestJSON: String ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      CredentialManager.create(activity).createCredential(
        activity, CreatePublicKeyCredentialRequest(requestJSON)
      ).data.getString("androidx.credentials.BUNDLE_KEY_REGISTRATION_RESPONSE_JSON")
    }

    AsyncFunction("get") Coroutine { requestJSON: String ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      (CredentialManager.create(activity).getCredential(
        activity,
        GetCredentialRequest(listOf(GetPublicKeyCredentialOption(requestJSON), GetPasswordOption()))
      ).credential as PublicKeyCredential).authenticationResponseJson
    }
  }
}
