'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Signal, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'calling';

export default function CallInterface() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [userId, setUserId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;

    ws.current = new WebSocket(`wss://3cfdedc35589.ngrok-free.app/ws/${userId}`);

    ws.current.onopen = () => {
      console.log("✅ WebSocket connected");
      setIsConnected(true);
      toast({ title: "WebSocket Connected" });
    };

    ws.current.onmessage = async (e) => {
      const message = JSON.parse(e.data);
      console.log("📩 Received:", message);

      switch (message.type) {
        case 'offer':
          await handleOffer(message);
          break;
        case 'answer':
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.sdp));
          }
          break;
        case 'ice':
          if (peerConnectionRef.current && message.candidate) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
          }
          break;
      }
    };

    ws.current.onclose = () => {
      console.log("❌ WebSocket closed");
      setIsConnected(false);
      setCallStatus('idle');
    };

    return () => {
      ws.current?.close();
      ws.current = null;
    };
  }, [userId]);

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 미디어 및 연결 정리
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionRef.current?.close();
    };
  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.current && targetId) {
        ws.current.send(JSON.stringify({
          type: 'ice',
          candidate: event.candidate,
          to: targetId,
        }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoOn });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 음성 볼륨 로그용 AudioContext
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const logVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        console.log("🎙️ 현재 음성 레벨:", avg.toFixed(2));
        requestAnimationFrame(logVolume);
      };
      logVolume();

      toast({ title: "Media Ready", description: "Camera and microphone access granted." });
      return stream;
    } catch {
      toast({ title: "Media Error", description: "카메라 및 마이크 권한을 허용해주세요.", variant: "destructive" });
      throw new Error("Media permission denied");
    }
  };

  const call = async () => {
    if (!ws.current || !targetId) return;

    setCallStatus('connecting');

    const stream = await startLocalStream();

    peerConnectionRef.current = createPeerConnection();

    stream.getTracks().forEach(track => {
      peerConnectionRef.current?.addTrack(track, stream);
    });

    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);

    ws.current.send(JSON.stringify({
      type: 'offer',
      to: targetId,
      sdp: offer,
    }));

    setCallStatus('calling');
  };

  const handleOffer = async (message: any) => {
    setCallStatus('connecting');

    const stream = await startLocalStream();

    peerConnectionRef.current = createPeerConnection();

    stream.getTracks().forEach(track => {
      peerConnectionRef.current?.addTrack(track, stream);
    });

    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.sdp));

    const answer = await peerConnectionRef.current.createAnswer();
    await peerConnectionRef.current.setLocalDescription(answer);

    ws.current?.send(JSON.stringify({
      type: 'answer',
      to: message.from || userId, // from이 없으면 자기 자신
      sdp: answer,
    }));

    setCallStatus('connected');
  };

  const endCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallStatus('idle');
    toast({ title: "Call Ended", description: "통화가 종료되었습니다." });
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOn(videoTrack.enabled);
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connected': return 'bg-green-600 text-white';
      case 'connecting': return 'bg-yellow-500 text-black';
      case 'calling': return 'bg-yellow-400 text-black';
      default: return 'bg-gray-300 text-black';
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">

        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Phone className="w-6 h-6 text-green-600" />
              <CardTitle>Internal Call System</CardTitle>
            </div>
            <Badge className={getStatusColor()}>
              {callStatus === 'idle' ? 'Ready' : callStatus.charAt(0).toUpperCase() + callStatus.slice(1)}
            </Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Setup</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              placeholder="Your ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value.trim())}
              disabled={isConnected}
            />
            <Input
              placeholder="Target ID"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value.trim())}
              disabled={callStatus !== 'idle'}
            />

            <div className="flex gap-4">
              <Button
                onClick={call}
                disabled={!userId || !targetId || callStatus !== 'idle' || !isConnected}
              >
                Call
              </Button>
              <Button
                variant="destructive"
                onClick={endCall}
                disabled={callStatus === 'idle'}
              >
                Hang Up
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Local Video</CardTitle></CardHeader>
            <CardContent>
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full rounded" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Remote Video</CardTitle></CardHeader>
            <CardContent>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full rounded" />
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={toggleMute} disabled={callStatus === 'idle'}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button onClick={toggleVideo} disabled={callStatus === 'idle'}>
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
