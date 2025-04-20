import app from "./app.js";

// Global error handlers to catch unhandled exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error('Error details:', error);
  console.error('Stack trace:', error.stack);
  
  // Exit with error code
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error('Error details:', error);
  
  // Exit with error code
  process.exit(1);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
