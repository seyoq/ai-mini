'use client'

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'calling';

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export default function CallInterface() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [userId, setUserId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState(''); // 음성 텍스트 저장
const [receivedTranscript, setReceivedTranscript] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);


const recognitionRef = useRef<any>(null);


  const remoteAudioRef = useRef<HTMLAudioElement>(null);

useEffect(() => {
  if (!isConnected) return;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('이 브라우저는 SpeechRecognition API를 지원하지 않습니다.');
    return;
  }

  if (!recognitionRef.current) {
    recognitionRef.current = new SpeechRecognition();
  }

  const recognition = recognitionRef.current;
try {
  recognition.start();
} catch (e) {
  console.error('[SpeechRecognition] start 실패:', e);
}
  recognition.lang = 'ko-KR';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => console.log('[SpeechRecognition] 시작됨');

  recognition.onend = () => {
    console.log('[SpeechRecognition] 종료됨, 1초 후 다시 시작 시도');
    setTimeout(() => {
      try {
        recognition.start();
      } catch (error) {
        console.error('[SpeechRecognition] 재시작 에러:', error);
      }
    }, 1000);
  };

  recognition.onerror = (e: any) => {
    console.error('[SpeechRecognition] 에러:', e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      console.warn('마이크 권한 거부됨, 인식 중지');
      recognition.stop();
    }
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
  let finalTranscript = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcriptChunk = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += transcriptChunk + ' ';
    }
  }

  if (finalTranscript.trim()) {
    console.log('🎙️ 인식된 음성:', finalTranscript);

    // 📤 WebSocket 전송 로그
    if (ws.current && targetId) {
      console.log('📤 전송할 transcript 메시지:', {
        type: 'transcript',
        to: targetId,
        text: finalTranscript,
      });

      ws.current.send(JSON.stringify({
        type: 'transcript',
        to: targetId,
        text: finalTranscript,
      }));
    }
  }
};





  return () => {
    recognition.stop();
  };
}, [isConnected]);


  // WebSocket 연결
  useEffect(() => {
    if (!userId || ws.current) return;

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
        case 'ice':
          if (peerConnectionRef.current && message.candidate) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
          }
          break;
        case 'answer':
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.sdp));
            setCallStatus('connected');
          }
          break;
           case 'transcript':
      console.log('📥 transcript 메시지 수신됨:', message.text);
      if (message.text) {
        setReceivedTranscript(prev => {
          const updated = prev + message.text + ' ';
          console.log('🖊️ 화면에 표시할 receivedTranscript:', updated);
          return updated;
        });
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

  // 컴포넌트 언마운트 시 리소스 정리
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionRef.current?.close();
    };
  }, []);

  // PeerConnection 생성
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

//    pc.ontrack = (event) => {
//   const stream = event.streams[0];
//   console.log("📡 Remote stream received:", stream);
//   console.log("🎧 Audio tracks:", stream.getAudioTracks());
//   if (remoteVideoRef.current) {
//     remoteVideoRef.current.srcObject = stream;
//   }
// };
pc.ontrack = (event) => {
  const stream = event.streams[0];

  // 비디오 연결
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = stream;
  }

  // 오디오 연결
  if (remoteAudioRef.current) {
    remoteAudioRef.current.srcObject = stream;
  }

  console.log("📡 Remote stream received:", stream);
  console.log("🎧 Audio tracks:", stream.getAudioTracks());
};


    return pc;
  };

  // 로컬 미디어 스트림 가져오기
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoOn });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 음성 볼륨 로그용 AudioContext (필요시 사용)
      /*
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const logVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        // console.log("🎙️ 현재 음성 레벨:", avg.toFixed(2));
        requestAnimationFrame(logVolume);
      };
      logVolume();
      */

      toast({ title: "Media Ready", description: "Camera and microphone access granted." });
      return stream;
    } catch {
      toast({ title: "Media Error", description: "카메라 및 마이크 권한을 허용해주세요.", variant: "destructive" });
      throw new Error("Media permission denied");
    }
  };

  // 호출 시작
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

  // offer 처리 및 answer 생성
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
      to: message.from || userId,
      sdp: answer,
    }));

    setCallStatus('connected');
  };


  // 통화 종료
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

  // 마이크 음소거 토글
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  // 비디오 토글
  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOn(videoTrack.enabled);
  };

  // 상태별 배지 색상
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
<audio ref={remoteAudioRef} autoPlay />

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

        <Card>
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[100px] p-2 border rounded bg-white text-black whitespace-pre-wrap">
              {transcript || "음성을 인식 중입니다..."}
            </div>
          </CardContent>
        </Card>

        <Card>
  <CardHeader>
    <CardTitle>My Speech</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="min-h-[100px] p-2 border rounded bg-white text-black whitespace-pre-wrap">
      {transcript || "내 음성을 인식 중..."}
    </div>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>Partner's Speech</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="min-h-[100px] p-2 border rounded bg-white text-black whitespace-pre-wrap">
      {receivedTranscript || "상대방 음성을 기다리는 중..."}
    </div>
  </CardContent>
</Card>


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
