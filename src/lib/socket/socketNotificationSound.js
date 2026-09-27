"use client";

import { useEffect, useRef } from "react";
import { socket } from "@/socket";

const SocketNotificationSound = () => {
  const audioUnlocked = useRef(false);
  const hasPendingSound = useRef(false);

  const playSound = () => {
    const sound = new Audio("/assets/audio/notification/notification_tone.mp3");
    sound.play().catch((error) => {
      console.error("Audio playback failed:", error);
    });
  };

  // const handleNotificationSound = (value) => {
  //   console.log("Notification Sound : value :", value);
  //   if (!audioUnlocked.current) {
  //     hasPendingSound.current = true; // mark to play once unlocked
  //     return;
  //   }

  //   playSound();
  // };

  const handleNotificationSound = (value, eventName) => {
    // console.log("Notification from event:", eventName, "with value:", value);
  
    if (!audioUnlocked.current) {
      hasPendingSound.current = true; // mark to play once unlocked
      return;
    }
  
    playSound();
  };

  const unlockAudio = () => {
    audioUnlocked.current = true;
    window.removeEventListener("click", unlockAudio);

    if (hasPendingSound.current) {
      playSound(); // play missed sound
      hasPendingSound.current = false;
    }
  };

  useEffect(() => {
    window.addEventListener("click", unlockAudio);
    
    // console.log("Socket Notification Sound : Socket Connected :", socket.connected);

    const events = [
      "get-whatsapp-new-chat",
      "get-new-chat",
      "receive-message",
      "receive-whatsapp-message",
      "send-new-order-update",
      "send-order-details-update",
    ];
  
    const handlers = {};
  
    events.forEach((event) => {
      const handler = (value) => handleNotificationSound(value, event);
      handlers[event] = handler;
      socket.on(event, handler);
    });
  
    return () => {
      window.removeEventListener("click", unlockAudio);
      events.forEach((event) => {
        socket.off(event, handlers[event]);
      });
    };
  }, []);
  

  // useEffect(() => {
  //   window.addEventListener("click", unlockAudio);

  //   const events = [
  //     "get-whatsapp-new-chat",
  //     "get-new-chat",
  //     "receive-message",
  //     "receive-whatsapp-message",
  //     "send-new-order-update",
  //     "send-order-details-update",
  //   ];

  //   events.forEach((event) => {
  //     console.log("Socket Event :", event);
  //     socket.on(event, handleNotificationSound);
  //   });

  //   return () => {
  //     window.removeEventListener("click", unlockAudio);
  //     events.forEach((event) => {
  //       socket.off(event, handleNotificationSound);
  //     });
  //   };
  // }, []);

  return null;
};

export default SocketNotificationSound;


// "use client";

// import { useEffect } from "react";
// import { socket } from "@/socket";

// const SocketNotificationSound = () => {
//   useEffect(() => {
//     // Ensure audio plays only after user interaction
//     let audioUnlocked = false;

//     const handleNotificationSound = () => {
//       if (!audioUnlocked) return;

//       const sound = new Audio("/assets/audio/notification/notification_tone.mp3");
//       sound.play().catch((error) => {
//         console.error("Audio playback failed:", error);
//       });
//     };

//     const unlockAudio = () => {
//       audioUnlocked = true;
//       window.removeEventListener("click", unlockAudio);
//     };

//     window.addEventListener("click", unlockAudio);

//     socket.on("get-whatsapp-new-chat", handleNotificationSound);
//     socket.on("get-new-chat", handleNotificationSound);
//     socket.on("receive-message", handleNotificationSound);
//     socket.on("receive-whatsapp-message", handleNotificationSound);
//     socket.on("send-new-order-update", handleNotificationSound);
//     socket.on("send-order-details-update", handleNotificationSound);

//     // return () => {
//     //   socket.off("get-whatsapp-new-chat", handleNotificationSound);
//     //   socket.off("get-new-chat", handleNotificationSound);
//     //   socket.off("receive-message", handleNotificationSound);
//     //   socket.off("receive-whatsapp-message", handleNotificationSound);
//     //   socket.off("send-new-order-update", handleNotificationSound);
//     //   socket.off("send-order-details-update", handleNotificationSound);
//     // };
//   }, []);

//   return null;
// };

// export default SocketNotificationSound;


// "use client";

// import { socket } from "@/socket";
// import { useEffect, useRef } from "react";

// const SocketNotificationSound = () => {
//   // Initialize the audio ref with the Audio object
//   const audio = useRef(null);
//   const isPlaying = useRef(false); // Track if the audio is playing

//   const handleNotificationSound = () => {
//     if (isPlaying.current) return; // If the sound is already playing, don't play it again

//     isPlaying.current = true; // Set the flag to true when the sound starts playing
//     audio.current.play().catch((error) => {
//       console.error("Audio playback failed:", error);
//     });
//     // alert("Notification Sound");
//     // Reset the flag after the audio has finished playing
//     audio.current.onended = () => {
//       isPlaying.current = false; // Reset flag after the sound has finished playing
//     };
//   };

//   useEffect(() => {
//     // Initialize the audio object in the useEffect (only in the client-side)
//     if (typeof window !== "undefined") {
//       audio.current = new Audio("/assets/audio/notification/notification_tone.mp3");
//     }

//     // Function to register all event listeners
//     const registerEvents = () => {
//       socket.on("get-whatsapp-new-chat", handleNotificationSound);
//       socket.on("get-new-chat", handleNotificationSound);
//       socket.on("receive-message", handleNotificationSound);
//       socket.on("receive-whatsapp-message", handleNotificationSound);
//       socket.on("send-new-order-update", handleNotificationSound);
//       socket.on("send-order-details-update", handleNotificationSound);
//     };

//     // Check if socket is connected already
//     if (socket.connected) {
//       registerEvents();
//     }
//   }, []); // Empty dependency array ensures this runs only once on mount

//   return null; // No UI component is needed
// };

// export default SocketNotificationSound;
