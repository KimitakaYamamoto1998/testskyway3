// main.js

const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory, uuidV4 } = skyway_room;

const token = new SkyWayAuthToken({
    jti: uuidV4(),
    iat: nowInSec(),
    exp: nowInSec() + 60 * 60 * 24,
    scope: {
        app: {
            id: "4a7c0614-dfc1-478b-ab8a-07c6566fd099",
            turn: true,
            actions: ['read'],
            channels: [
                {
                    id: '*',
                    name: '*',
                    actions: ['write'],
                    members: [
                        {
                            id: '*',
                            name: '*',
                            actions: ['write'],
                            publication: {
                                actions: ['write'],
                            },
                            subscription: {
                                actions: ['write'],
                            },
                        },
                    ],
                    sfuBots: [
                        {
                            actions: ['write'],
                            forwardings: [
                                {
                                    actions: ['write'],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    },
}).encode("g6fpXSdbxTfAMBm/aC7cvcFO0XONOf6wPJbco577uM0=");

document.addEventListener('DOMContentLoaded', function () {
    const videoToggle = document.getElementById('videoToggle');
    const localVideo = document.getElementById('local-video');
    const status = document.getElementById('status');

    videoToggle.addEventListener('change', function () {
        if (this.checked) {
            localVideo.style.display = 'block';
            status.textContent = 'カメラ ON';
        } else {
            localVideo.style.display = 'none';
            status.textContent = 'カメラ OFF';
        }
    });
});

(async () => {
    const localVideo = document.getElementById('local-video');
    const buttonArea = document.getElementById('button-area');
    const remoteMediaArea = document.getElementById('remote-media-area');
    const channelNameInput = document.getElementById('channel-name');
    const dataStreamInput = document.getElementById('data-stream');
    const myId = document.getElementById('my-id');
    const joinButton = document.getElementById('join');
    const writeButton = document.getElementById('write');


    const { audio, video } =
        await SkyWayStreamFactory.createMicrophoneAudioAndCameraStream();
    video.attach(localVideo);
    await localVideo.play();

    const data = await SkyWayStreamFactory.createDataStream();
    writeButton.onclick = () => {
        data.write(dataStreamInput.value);
        dataStreamInput.value = '';
    };

    joinButton.onclick = async () => {
        if (channelNameInput.value === '') return;
    
        const context = await SkyWayContext.Create(token);
        const channel = await SkyWayRoom.FindOrCreate(context, {
            type: 'p2p',
            name: channelNameInput.value,
        });
        const me = await channel.join();
    
        myId.textContent = me.id;
    
        await me.publish(audio);
        await me.publish(video);
        await me.publish(data);
    
        const subscribeAndAttach = async (publication) => {
            if (publication.publisher.id === me.id) {
                return;
            }
        
            // 自動的に購読
            const { stream } = await me.subscribe(publication.id);
        
            switch (stream.contentType) {
                case 'video':
                    {
                        const videoContainer = document.createElement('div');
                        videoContainer.classList.add('video-container');
        
                        const elm = document.createElement('video');
                        elm.playsInline = true;
                        elm.autoplay = true;
                        elm.classList.add('video-element');
                        stream.attach(elm);
        
                        videoContainer.appendChild(elm);
                        remoteMediaArea.appendChild(videoContainer);
                    }
                    break;
                // ... （他のケースは変更なし）
            }
        };
        
        // 初回の既存ユーザーのストリームを購読
        channel.publications.forEach(subscribeAndAttach);
        
        // 新しいユーザーがRoomに参加したときのイベントリスナー
        channel.onStreamPublished.add((e) => subscribeAndAttach(e.publication));
    };
})();
