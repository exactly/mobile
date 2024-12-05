import SwiftUI
import WidgetKit

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
    let entry = SimpleEntry(date: Date())
    completion(entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    var entries: [SimpleEntry] = []

    let currentDate = Date()
    for hourOffset in 0..<5 {
      let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
      let entry = SimpleEntry(date: entryDate)
      entries.append(entry)
    }

    let timeline = Timeline(entries: entries, policy: .atEnd)
    completion(timeline)
  }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
}

struct CardModeEntryView: View {
  var entry: Provider.Entry

  var body: some View {
    let defaults = UserDefaults(suiteName: "group.app.exactly")
    let index = defaults?.integer(forKey: "index")
    Text("\(index ?? 666)")
  }
}

struct CardMode: Widget {
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
    CardModeEntryView(entry: SimpleEntry(date: Date()))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
