import React from 'react';
import { Check, CheckCheck } from 'lucide-react';


const MessageStatus = ({ status = "sent" }) => {
  switch (status) {
    case 'sent':
      return <Check size={16} className="text-gray-400" />;
    case 'delivered':
      return <CheckCheck size={16} className="text-gray-400" />;
    case 'read':
      return <CheckCheck size={16} className="text-blue-500" />;
    default:
      return null;
  }
};

export default MessageStatus;

