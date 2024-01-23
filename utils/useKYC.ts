import { useCallback } from "react";
import { Platform } from "react-native";
import { Inquiry, Environment } from "react-native-persona";

const TEMPLATE = "itmpl_F55H8zDZBk9gqy8mRK1aC27X";

export default () => {
  const native = useCallback(() => {
    const instance = Inquiry.fromTemplate(TEMPLATE)
      .environment(Environment.SANDBOX)
      .onComplete((inquiryId, status, fields) => console.log(inquiryId, status, fields))
      .onCanceled((inquiryId) => {})
      .build();

    instance.start();
  }, []);

  const hosted = useCallback(() => {}, []);

  return Platform.OS === "web" ? hosted : native;
};
