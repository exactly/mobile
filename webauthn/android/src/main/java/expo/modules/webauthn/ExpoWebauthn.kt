package expo.modules.webauthn

import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPasswordOption
import androidx.credentials.GetPublicKeyCredentialOption
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoWebauthn : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoWebauthn")

    AsyncFunction("create") Coroutine { requestJSON: String ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      CredentialManager.create(activity)
        .createCredential(activity, CreatePublicKeyCredentialRequest(requestJSON))
    }

    AsyncFunction("get") Coroutine { requestJSON: String ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      CredentialManager.create(activity).getCredential(
        activity,
        GetCredentialRequest(listOf(GetPublicKeyCredentialOption(requestJSON), GetPasswordOption()))
      )
    }
  }
}
