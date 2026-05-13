<template>
  <div class="relative group cursor-pointer">
    <!-- Glow Effect -->
    <div class="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
    
    <svg 
      width="48" 
      height="48" 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      class="relative"
    >
      <!-- Background Circle -->
      <circle cx="24" cy="24" r="22" fill="url(#paint0_linear)" fill-opacity="0.1" stroke="url(#paint1_linear)" stroke-width="0.5"/>
      
      <!-- Inner Play Layers (Batch Effect) -->
      <path d="M18 14L34 24L18 34V14Z" fill="url(#paint2_linear)" fill-opacity="0.3" class="translate-x-1 translate-y-1"/>
      <path d="M18 14L34 24L18 34V14Z" fill="url(#paint3_linear)"/>
      
      <!-- Accent Line -->
      <path d="M34 24L26 29V19L34 24Z" fill="white" fill-opacity="0.2"/>
      
      <!-- Agent Circuit Detail -->
      <rect x="14" y="14" width="2" height="2" rx="1" fill="#FF0000"/>
      <rect x="14" y="32" width="2" height="2" rx="1" fill="#FF0000"/>
      
      <defs>
        <linearGradient id="paint0_linear" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stop-color="white"/>
          <stop offset="1" stop-color="white" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="paint1_linear" x1="24" y1="0" x2="24" y2="48" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF0000"/>
          <stop offset="1" stop-color="#991b1b"/>
        </linearGradient>
        <linearGradient id="paint2_linear" x1="26" y1="14" x2="26" y2="34" gradientUnits="userSpaceOnUse">
          <stop stop-color="#7f1d1d"/>
          <stop offset="1" stop-color="#ef4444" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="paint3_linear" x1="26" y1="14" x2="26" y2="34" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ef4444"/>
          <stop offset="1" stop-color="#b91c1c"/>
        </linearGradient>
      </defs>
    </svg>
  </div>
</template>
