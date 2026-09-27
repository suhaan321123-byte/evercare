import React from "react";

const ChatTabs = ({ activeTab, onTabChange, primaryColor }) => {
  return (
    <div className="chat-tabs" style={{ "--primary-color": primaryColor }}>
      <button
        className={`tab ${activeTab === "chat" ? "active" : ""}`}
        onClick={() => onTabChange("chat")}
      >
        Chat
      </button>
      <button
        className={`tab ${activeTab === "history" ? "active" : ""}`}
        onClick={() => onTabChange("history")}
      >
        History
      </button>
    </div>
  );
};

export default ChatTabs;
