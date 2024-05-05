import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [roomName, setRoomName] = useState('')

  const joinRoom = () => {
    router.push(`/room/${roomName || Math.random().toString(36).slice(2)}`)
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      <Head>
        <title>Native WebRTC API with NextJS</title>
        <meta name="description" content="Use Native WebRTC API for video conferencing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className='max-w-md p-4 bg-white rounded-lg shadow-md'>
        <h1 className='text-2xl font-bold mb-4'>Let`s join a room!</h1>
        <input
          type="text"
          onChange={(e) => setRoomName(e.target.value)}
          value={roomName}
          className='w-full px-3 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500'
          placeholder='Enter room name'
        />
        <button
          onClick={joinRoom}
          type="button"
          className='w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600'
        >
          Join Room
        </button>
      </main>
    </div>
  )
}
