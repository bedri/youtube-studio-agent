# Firebase REST API Sync Implementation Plan (Backup Reference)

This document contains the complete blueprint to implement cloud-based database synchronization for YouTube Analytics history, enabling assistants to view analytics data without direct YouTube Studio permissions.

## 1. Firebase Setup (Console)

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name it `youtube-studio-agent` (or similar) and disable Google Analytics (optional).
3. Under the **Build** section, select **Realtime Database** and click **Create Database**.
4. Choose a database location close to your server (e.g., Europe or US) and start in **Locked Mode**.
5. Go to the **Rules** tab and set them to allow read/write access using a secret query parameter (or define specific token authentication):
   ```json
   {
     "rules": {
       ".read": "auth != null || query.auth == 'your-db-secret'",
       ".write": "auth != null || query.auth == 'your-db-secret'"
     }
   }
   ```
6. In **Project Settings** > **Service Accounts** > **Database Secrets**, copy the secret token to use as your authentication key.

## 2. Environment Variables (.env)

Add the following keys to your `/home/bedri/Projects/Youtube-Agent/.env` file:
```bash
FIREBASE_DATABASE_URL="https://your-db-id-default-rtdb.firebaseio.com"
FIREBASE_SECRET_KEY="your-copied-database-secret-key"
```

## 3. Server-Side Integration (Nuxt API)

Modify the analytics endpoint `server/api/youtube/analytics.get.ts` to sync data to Firebase whenever the owner (authenticated with full OAuth) fetches it.

### Write/Sync Data (Owner Flow)
Inside the successful OAuth block in `analytics.get.ts`:
```typescript
const dbUrl = process.env.FIREBASE_DATABASE_URL
const dbSecret = process.env.FIREBASE_SECRET_KEY

if (dbUrl && dbSecret && dailyData.length > 0) {
  try {
    const syncUrl = `${dbUrl}/channels/${channelId}/analytics.json?auth=${dbSecret}`
    await $fetch(syncUrl, {
      method: 'PUT',
      body: {
        dailyData,
        trafficData,
        lastUpdated: new Date().toISOString()
      }
    })
    console.log('[Firebase] Successfully synced channel analytics to cloud.')
  } catch (syncError) {
    console.error('[Firebase] Failed to sync analytics:', syncError)
  }
}
```

### Read Data (Assistant / Fallback Flow)
Inside the `serveLocalHistory` or public API Key fallback function in `analytics.get.ts`:
```typescript
const dbUrl = process.env.FIREBASE_DATABASE_URL
const dbSecret = process.env.FIREBASE_SECRET_KEY

if (dbUrl && dbSecret) {
  try {
    const fetchUrl = `${dbUrl}/channels/${channelId}/analytics.json?auth=${dbSecret}`
    const cloudData: any = await $fetch(fetchUrl)
    if (cloudData && cloudData.dailyData) {
      console.log('[Firebase] Serving cached analytics from cloud database.')
      return {
        dailyData: cloudData.dailyData,
        trafficData: cloudData.trafficData,
        isDemoMode: false,
        isCloudCached: true
      }
    }
  } catch (cloudError) {
    console.warn('[Firebase] Failed to read cloud cache, falling back to local simulation:', cloudError)
  }
}
```
