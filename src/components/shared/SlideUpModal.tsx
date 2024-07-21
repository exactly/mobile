import React from "react";
import { Modal } from "react-native";

import SafeView from "./SafeView.js";

interface SlideUpModalProperties {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
}

const SlideUpModal = ({ children, isOpen, onClose }: SlideUpModalProperties) => {
  return (
    <Modal visible={isOpen} animationType="slide" onDismiss={onClose} onRequestClose={onClose} transparent>
      <SafeView>{children}</SafeView>
    </Modal>
  );
};

export default SlideUpModal;
