import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Ensures the server is accessible externally
    port: 8000,
    allowedHosts: [
      'chatmyteserve.onrender.com', // Add your Render app URL here
      'localhost', // Optional: Allow localhost for local development
    ],
  },
});
