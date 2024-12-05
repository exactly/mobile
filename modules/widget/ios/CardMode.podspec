Pod::Spec.new do |s|
  s.name = "CardMode"
  s.version = "1.0.0"
  s.summary = "Card mode widget module"
  s.description = "Control module for card mode widget"
  s.author = "exactly"
  s.homepage = "https://github.com/exactly/mobile"
  s.platforms = { :ios => "15.1" }
  s.source = { git: "https://github.com/exactly/mobile.git" }
  s.static_framework = true
  s.dependency "ExpoModulesCore"
  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
