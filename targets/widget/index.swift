import AppIntents
import SwiftUI
import WidgetKit

@main
struct Widgets: WidgetBundle {
  var body: some Widget {
    CardModeWidget()
  }
}

func getCardMode() -> Int {
  return UserDefaults(suiteName: "group.app.exactly")?.integer(forKey: "index") ?? 1
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> CardModeEntry {
    CardModeEntry(date: Date(), mode: getCardMode())
  }

  func getSnapshot(in context: Context, completion: @escaping (CardModeEntry) -> Void) {
    completion(CardModeEntry(date: Date(), mode: getCardMode()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    completion(
      Timeline(entries: [CardModeEntry(date: Date(), mode: getCardMode())], policy: .never))
  }
}

struct CardModeEntry: TimelineEntry {
  let date: Date
  let mode: Int
}

struct SetCardMode: AppIntent {
  static var title: LocalizedStringResource = "Set Card Mode"

  func perform() async throws -> some IntentResult {
    print("SetCardMode")
    return .result()
  }
}

struct CardModeEntryView: View {
  var entry: Provider.Entry
  @State private var creditMode = false

  var body: some View {
    Toggle(isOn: creditMode, intent: SetCardMode()) {
      Text("\(entry.mode)")
    }
  }
}

struct CardModeWidget: Widget {
  let kind: String = "CardMode"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      if #available(iOS 17.0, *) {
        CardModeEntryView(entry: entry)
          .containerBackground(.fill.tertiary, for: .widget)
      } else {
        CardModeEntryView(entry: entry)
          .padding()
          .background()
      }
    }.configurationDisplayName("Exa Card Mode")
      .description("Switch between payment options: debit, credit, and installments.")
      .supportedFamilies([.systemSmall])
  }
}

struct CardMode_Previews: PreviewProvider {
  static var previews: some View {
    CardModeEntryView(entry: CardModeEntry(date: Date(), mode: getCardMode()))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
