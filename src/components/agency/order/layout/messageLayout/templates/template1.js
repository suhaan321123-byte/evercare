const Template1 = () => {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg max-w-md w-full">
      <div className="flex items-center mb-4">
        <i className="fas fa-file-pdf text-red-600 text-2xl mr-2"></i>
        <div>
          <p className="text-sm">theater-Proposal-01-Feb_267215.pdf</p>
          <p className="text-xs text-gray-400">
            13 KB, Microsoft Edge PDF Document
          </p>
        </div>
      </div>
      <button className="bg-gray-700 text-white py-2 px-4 rounded-lg w-full mb-4">
        Download
      </button>
      <p className="mb-2">Hello,</p>
      <p className="mb-2">I hope you&apos;re doing well!</p>
      <p className="mb-2">
        I wanted to share a business proposal with you regarding Theater.
      </p>
      <p className="mb-2">
        Please find the details in the attached PDF document.
      </p>
      <p className="mb-2">
        If you&apos;d like to discuss this in more detail, I&apos;d be happy to arrange
        a call or meeting at your convenience.
      </p>
      <p className="mb-2">Looking forward to hearing from you!</p>
      <p className="mb-2">Phone: 9446464195.</p>
      <p>Thank you</p>
    </div>
  );
};

export default Template1;