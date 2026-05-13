<script setup lang="ts">
const { data: auth, refresh: refreshAuth } = await useFetch('/api/me')
const { data: videos, status: videosStatus, refresh: refreshVideos } = await useFetch('/api/youtube/videos', {
  immediate: false,
  watch: [auth]
})

onMounted(() => {
  if (auth.value?.authenticated) {
    refreshVideos()
  }
})

const selectedVideos = ref<string[]>([])
const isUpdating = ref(false)
const isDeleting = ref(false)
const isDeleteConfirmed = ref(false)
const isClearModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const videoToDelete = ref<any>(null)
const isPlayerOpen = ref(false)
const selectedVideoForPlay = ref<any>(null)
const updateProgress = ref(0)

const form = reactive({
  title: '',
  description: '',
  tags: '',
  tagsAction: 'add',
  privacyStatus: '',
  categoryId: '',
  license: ''
})

const channelForm = reactive({
  title: auth.value?.channel?.title || '',
  description: auth.value?.channel?.description || ''
})

const searchQuery = ref('')
const isChannelModalOpen = ref(false)
const isChannelUpdating = ref(false)

const columns = [
  { id: 'select', key: 'select', label: 'Select' },
  { id: 'image', key: 'image', label: 'Image' },
  { id: 'title', key: 'title', label: 'Title', sortable: true },
  { id: 'stats', key: 'stats', label: 'Stats' },
  { id: 'status', key: 'status', label: 'Status' },
  { id: 'actions', key: 'actions', label: '' }
]

const items = [
  { label: 'Videos', icon: 'i-heroicons-video-camera', value: 'videos' },
  { label: 'Shorts', icon: 'i-heroicons-bolt', value: 'shorts' }
]

const filteredVideos = computed(() => {
  if (!videos.value) return []
  
  let result = videos.value.filter(v => {
    const durationStr = v.contentDetails?.duration || ''
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!matches) return false
    
    const hours = parseInt(matches[1] || '0')
    const minutes = parseInt(matches[2] || '0')
    const seconds = parseInt(matches[3] || '0')
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds
    
    const isShort = totalSeconds <= 180
    return activeTab.value === 'shorts' ? isShort : !isShort
  })

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.snippet.title.toLowerCase().includes(q) || 
      v.snippet.description.toLowerCase().includes(q)
    )
  }

  return result.map(v => ({
    ...v,
    class: 'group'
  }))
})

const activeTab = ref('videos')

const toggleSelection = (id: string) => {
  const index = selectedVideos.value.indexOf(id)
  if (index > -1) {
    selectedVideos.value.splice(index, 1)
  } else {
    selectedVideos.value.push(id)
  }
}

const selectAll = () => {
  if (selectedVideos.value.length === videos.value?.length) {
    selectedVideos.value = []
  } else {
    selectedVideos.value = videos.value?.map(v => v.id) || []
  }
}

const openPlayer = (video: any) => {
  selectedVideoForPlay.value = video
  isPlayerOpen.value = true
}

const populateForm = (video: any) => {
  form.title = video.snippet.title
  form.description = video.snippet.description
  form.tags = (video.snippet.tags || []).join(', ')
}

const showClearConfirm = ref(false)
const toast = useToast()

const clearForm = () => {
  form.title = ''
  form.description = ''
  form.tags = ''
  showClearConfirm.value = false
  toast.add({ title: 'Form cleared', color: 'red' })
}

const handleBatchUpdate = async () => {
  if (selectedVideos.value.length === 0) return
  
  isUpdating.value = true
  updateProgress.value = 0
  
  try {
    const res = await $fetch('/api/youtube/batch-update', {
      method: 'POST',
      body: {
        videoIds: selectedVideos.value,
        changes: {
          title: form.title || undefined,
          description: form.description || undefined,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()) : undefined,
          tagsAction: form.tagsAction,
          privacyStatus: form.privacyStatus || undefined,
          categoryId: form.categoryId || undefined,
          license: form.license || undefined
        }
      }
    })
    
    // Refresh to see changes
    await refreshVideos()
    selectedVideos.value = []
    alert('Toplu güncelleme tamamlandı!')
  } catch (e) {
    console.error(e)
    alert('Bir hata oluştu.')
  } finally {
    isUpdating.value = false
  }
}

const handleDeleteVideo = async () => {
  if (!videoToDelete.value) return
  
  isDeleting.value = true
  try {
    await $fetch('/api/youtube/delete', {
      method: 'POST',
      body: { videoIds: [videoToDelete.value.id] }
    })
    await refreshVideos()
    isDeleteModalOpen.value = false
    videoToDelete.value = null
    isDeleteConfirmed.value = false
    toast.add({ title: 'Video deleted successfully', color: 'red' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error deleting video', color: 'red' })
  } finally {
    isDeleting.value = false
  }
}

watch(isPlayerOpen, (val) => {
  if (!val) {
    selectedVideoForPlay.value = null
  }
})

watch(isDeleteModalOpen, (val) => {
  if (!val) {
    isDeleteConfirmed.value = false
  }
})
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
    <!-- Header -->
    <header class="flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <AppLogo />
        <div>
          <h1 class="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
            YouTube Batch Agent
          </h1>
          <p class="text-zinc-500 font-medium">Bulk manage your channel content</p>
        </div>
      </div>

      <div v-if="auth?.authenticated" class="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" @click="isChannelModalOpen = true">
        <div class="text-right hidden md:block">
          <p class="font-medium">{{ auth.channel?.title }}</p>
          <p class="text-xs text-zinc-500">Channel Settings</p>
        </div>
        <UAvatar :src="auth.channel?.thumbnails?.default?.url" :alt="auth.channel?.title" />
      </div>
      <a v-else href="/api/auth/login" class="btn-premium inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-red-900/20">
        <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5" />
        Connect YouTube
      </a>
    </header>

    <div v-if="auth?.authenticated" class="grid lg:grid-cols-3 gap-8">
      <!-- Sidebar: Controls -->
      <aside class="space-y-6">
        <UCard class="glass-card">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-pencil-square" class="w-5 h-5 text-red-500" />
                <h3 class="font-bold">Bulk Edit Actions</h3>
              </div>
              <div class="flex items-center gap-1">
                <template v-if="!showClearConfirm">
                  <UButton 
                    variant="ghost" 
                    color="zinc" 
                    size="xs" 
                    icon="i-heroicons-trash" 
                    @click="showClearConfirm = true"
                  >
                    Clear
                  </UButton>
                </template>
                <template v-else>
                  <UButton variant="soft" color="red" size="xs" @click="clearForm">Yes</UButton>
                  <UButton variant="ghost" color="zinc" size="xs" @click="showClearConfirm = false">No</UButton>
                </template>
              </div>
            </div>
          </template>

          <form @submit.prevent="handleBatchUpdate" class="space-y-4">
            <UFormField label="Title Template" help="Use {{title}} to preserve existing title">
              <UInput v-model="form.title" placeholder="e.g. [NEW] {{title}}" />
            </UFormField>

            <UFormField label="Description Template" help="Use {{description}} for existing content">
              <UTextarea v-model="form.description" placeholder="Add links or text..." :rows="4" />
            </UFormField>

            <UFormField label="Tags (comma separated)">
              <UInput v-model="form.tags" placeholder="vlog, gaming, tech..." />
            </UFormField>

            <UFormField label="Tags Action">
              <URadioGroup v-model="form.tagsAction" :options="[{ label: 'Add to existing', value: 'add' }, { label: 'Replace all', value: 'replace' }]" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Privacy Status">
                <USelectMenu v-model="form.privacyStatus" :items="[{ label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }, { label: 'Unlisted', value: 'unlisted' }]" placeholder="Keep existing" value-attribute="value" :search-input="false" />
              </UFormField>
              <UFormField label="Category">
                <USelectMenu v-model="form.categoryId" :items="[{ label: 'Gaming', value: '20' }, { label: 'Education', value: '27' }, { label: 'Entertainment', value: '24' }, { label: 'People & Blogs', value: '22' }]" placeholder="Keep existing" value-attribute="value" :search-input="false" />
              </UFormField>
            </div>

            <USeparator class="my-6" />

            <UButton 
              type="submit" 
              color="red" 
              block 
              class="btn-premium btn-update rounded-lg py-2.5 font-medium"
              :loading="isUpdating"
              :disabled="(selectedVideos?.length || 0) === 0"
            >
              Update {{ selectedVideos?.length || 0 }} Videos
            </UButton>
          </form>
        </UCard>
      </aside>

      <!-- Video List -->
      <main class="lg:col-span-2 space-y-4">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <UTabs v-model="activeTab" :items="items" class="w-full max-w-xs" />
          <div class="flex items-center gap-2 w-full md:w-auto">
            <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Search videos..." class="flex-grow md:w-64" />
            <UButton color="primary" variant="solid" size="sm" @click="refreshVideos" icon="i-heroicons-arrow-path" class="btn-premium px-4 shadow-sm">
              Refresh
            </UButton>
          </div>
        </div>

        <UCard class="glass-card !bg-zinc-900/20 overflow-hidden" :body-class="['!p-0']">
          <UTable 
            :data="filteredVideos" 
            :columns="columns"
            :loading="videosStatus === 'pending'"
            @row-click="({ row }) => toggleSelection(row.original.id)"
          >
            <template #select-header>
              <UCheckbox :model-value="(selectedVideos?.length || 0) === (videos?.length || 0) && (videos?.length || 0) > 0" @update:model-value="selectAll" />
            </template>

            <template #select-cell="{ row }">
              <UCheckbox :model-value="selectedVideos.includes(row.original.id)" @update:model-value="toggleSelection(row.original.id)" />
            </template>

            <template #image-cell="{ row }">
              <div class="flex justify-center">
                <div 
                  class="relative group cursor-pointer w-16 h-9 overflow-hidden rounded-lg shadow-lg border border-white/5" 
                  @click.stop="openPlayer(row.original)"
                >
                  <img :src="row.original.snippet.thumbnails.default.url" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <div class="w-6 h-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                      <UIcon name="i-heroicons-play-solid" class="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template #title-cell="{ row }">
              <div 
                class="max-w-xs truncate font-medium text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                @click.stop="populateForm(row.original)"
              >
                {{ row.original.snippet.title }}
              </div>
            </template>

            <template #stats-cell="{ row }">
              <div class="flex items-center gap-3 text-xs text-zinc-500">
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
                  {{ row.original.statistics?.viewCount || 0 }}
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-hand-thumb-up" class="w-3.5 h-3.5" />
                  {{ row.original.statistics?.likeCount || 0 }}
                </div>
              </div>
            </template>

            <template #status-cell="{ row }">
              <UBadge :color="row.original.status.privacyStatus === 'public' ? 'blue' : 'zinc'" variant="subtle">
                {{ row.original.status.privacyStatus }}
              </UBadge>
            </template>
            <template #actions-cell="{ row }">
              <UDropdownMenu :items="[[
                { label: 'Play', icon: 'i-heroicons-play', onSelect: () => openPlayer(row.original) },
                { label: 'Fill Form', icon: 'i-heroicons-pencil', onSelect: () => populateForm(row.original) }
              ], [
                { label: 'Delete Video', icon: 'i-heroicons-trash', color: 'red', onSelect: () => { videoToDelete = row.original; isDeleteModalOpen = true } }
              ]]">
                <UButton 
                  color="zinc" 
                  variant="ghost" 
                  icon="i-heroicons-ellipsis-horizontal" 
                  class="action-btn"
                  @click.stop
                />
              </UDropdownMenu>
            </template>
          </UTable>
        </UCard>
      </main>
    </div>

    <!-- Empty State -->
    <div v-else-if="!auth?.authenticated" class="flex flex-col items-center justify-center py-20 space-y-6">
      <div class="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center text-red-500 animate-pulse">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12" />
      </div>
      <div class="text-center space-y-2">
        <h2 class="text-3xl font-bold">Authentication Required</h2>
        <p class="text-zinc-500 max-w-md">Connect your YouTube channel to start managing your videos in batch.</p>
      </div>
    </div>

    <!-- Video Player Modal -->
    <UModal v-model:open="isPlayerOpen">
      <template #content>
        <div class="bg-black rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full mx-auto">
          <div class="aspect-video w-full">
            <iframe 
              v-if="selectedVideoForPlay"
              :src="`https://www.youtube.com/embed/${selectedVideoForPlay.id}?autoplay=1`"
              class="w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          <div class="p-4 bg-zinc-900 flex items-center justify-between border-t border-white/5">
            <div class="truncate mr-4">
              <h4 class="font-bold truncate text-white">{{ selectedVideoForPlay?.snippet?.title }}</h4>
              <p class="text-xs text-zinc-500">{{ selectedVideoForPlay?.snippet?.channelTitle }}</p>
            </div>
            <UButton color="zinc" variant="ghost" icon="i-heroicons-x-mark" @click="isPlayerOpen = false" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard class="glass-card !bg-zinc-950 border-red-500/20 shadow-2xl">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-trash" class="w-5 h-5 text-red-500" />
              <h3 class="font-bold text-red-500">DANGER: Permanent Deletion</h3>
            </div>
          </template>

          <div class="py-4 space-y-4">
            <p class="text-zinc-300">
              You are about to permanently delete this video from your YouTube channel. This action <span class="font-bold text-red-500 underline">cannot be undone</span>.
            </p>
            <div class="p-3 bg-zinc-900 rounded-lg border border-white/5">
              <p class="text-xs text-zinc-500 uppercase font-bold mb-1">Video Title</p>
              <p class="text-sm font-medium">{{ videoToDelete?.snippet?.title }}</p>
            </div>
            
            <div class="pt-4 border-t border-white/5">
              <UCheckbox 
                v-model="isDeleteConfirmed" 
                color="red" 
                label="I understand that this action is permanent and irreversible." 
                class="text-red-400 font-medium"
              />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3 w-full">
              <UButton color="zinc" variant="ghost" @click="isDeleteModalOpen = false" :disabled="isDeleting">Cancel</UButton>
              <UButton 
                color="red" 
                variant="solid"
                icon="i-heroicons-exclamation-triangle"
                @click="handleDeleteVideo" 
                :loading="isDeleting" 
                :disabled="!isDeleteConfirmed"
                class="btn-premium bg-red-600 hover:bg-red-700 text-white font-bold px-6 shadow-lg shadow-red-900/40"
              >
                Permanently Delete
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Channel Settings Modal -->
    <UModal v-model:open="isChannelModalOpen">
      <template #content>
        <UCard class="glass-card !bg-zinc-950 border-white/5 shadow-2xl max-w-2xl w-full mx-auto">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-red-500" />
              <h3 class="font-bold text-lg">Channel Identity</h3>
            </div>
          </template>

          <form @submit.prevent="async () => {
            isChannelUpdating = true
            try {
              await $fetch('/api/youtube/channel-update', { 
                method: 'POST', 
                body: { 
                  title: channelForm.title !== auth.channel?.title ? channelForm.title : undefined, 
                  description: channelForm.description 
                } 
              })
              await refreshAuth()
              isChannelModalOpen = false
              toast.add({ title: 'Channel updated successfully', color: 'red' })
            } catch (e) {
              toast.add({ title: 'Error updating channel', color: 'red' })
            } finally {
              isChannelUpdating = false
            }
          }" class="space-y-6 py-4">
            <UFormField label="Channel Title" help="Updating title may require channel verification">
              <UInput 
                v-model="channelForm.title" 
                :placeholder="auth.channel?.title" 
                class="!bg-zinc-900/50 border-white/5"
              />
            </UFormField>
            <UFormField label="Channel Description">
              <UTextarea 
                v-model="channelForm.description" 
                :placeholder="auth.channel?.description" 
                :rows="8" 
                class="!bg-zinc-900/50 border-white/5 font-sans leading-relaxed"
              />
            </UFormField>
            
            <div class="flex justify-end gap-3 pt-6 border-t border-white/5">
              <UButton color="zinc" variant="ghost" @click="isChannelModalOpen = false">Cancel</UButton>
              <UButton type="submit" color="red" :loading="isChannelUpdating" class="btn-premium px-8">Save Changes</UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
