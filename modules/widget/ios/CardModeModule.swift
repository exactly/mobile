import ExpoModulesCore
import WidgetKit

public class CardModeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CardMode")

    Function("set") { (key: String, value: String, group: String?) in
      let userDefaults = UserDefaults(suiteName: group)
      userDefaults?.set(value, forKey: key)
        
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
