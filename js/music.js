// BY - yun


// listenEvent("loadstart"); //客户端开始请求数据  
// listenEvent("progress"); //客户端正在请求数据   
// listenEvent("suspend"); //延迟下载  
// listenEvent("abort"); //客户端主动终止下载（不是因为错误引起），  
// listenEvent("error"); //请求数据时遇到错误  
// listenEvent("stalled"); //网速失速  
// listenEvent("play"); //play()和autoplay开始播放时触发  
// listenEvent("pause"); //pause()触发  
// listenEvent("loadedmetadata"); //成功获取资源长度  
// listenEvent("loadeddata"); //  
// listenEvent("waiting"); //等待数据，并非错误  
// listenEvent("playing"); //开始回放  
// listenEvent("canplay"); //可以播放，但中途可能因为加载而暂停  
// listenEvent("canplaythrough"); //可以播放，歌曲全部加载完毕  
// listenEvent("seeking"); //寻找中  
// listenEvent("seeked"); //寻找完毕  
// listenEvent("timeupdate"); //播放时间改变  
// listenEvent("ended"); //播放结束  
// listenEvent("ratechange"); //播放速率改变  
// listenEvent("durationchange"); //资源长度改变  
// listenEvent("volumechange"); //音量改变

var Media = new Audio();

var userAgentInfo = navigator.userAgent;
var Agents = ["Android", "iPhone",
    "SymbianOS", "Windows Phone",
    "iPad", "iPod"
];
var isPhone = false;
UA();
window.onresize = UA();

function UA() {
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            isPhone = Agents[v];
            break;
        }
    }
}


var app = new Vue({
    el: '#app',
    data: {
        theme: ['default', 'circle'],
        isNext: false,
        volumeTime: null,
        isPlayTime: null,
        showMuiscList: true,
        elWidth: 0,
        isSearch: false,
        keyWord: '',
        playInfo: {
            theme: 0,
            order: 0,
            volume: 0.5,
            isplay: false,
            duration: 0,
            time: '00:00',
            lineTime: '00:00',
            progress: 0,
            index: 0,
            name: '',
            singer: '',
            url: '',
            imgBase: '',
        },
        searchList: [],
        list: []
    },
    watch: {
        'playInfo.duration': {
            handler: function(val, oldVal) {
                window.duration = this.playInfo.duration
            },
            //深度观察监听
            deep: true
        },
        'isSearch': {
            handler: function(val, oldVal) {
                // this.$forceUpdate()
            },
            //深度观察监听
            deep: true
        }
    },
    mounted() {

        var _this = this;

        setTimeout(function() {
            _this.init()

        }, 1000)
    },

    methods: {
        // 点击背景切换主题
        clickMusickBg() {
            var index = this.playInfo.theme++;
            if (index == this.theme.length - 1) {
                this.playInfo.theme = 0;
            }
        },
        // 隐藏搜索框
        back() {
            this.isSearch = false;
        },
        init() {
            var _this = this;
            var playTime = null;
            // 获取数据
            axios.post('/music')
                .then(function(response) {
                    _this.list = response.data.body;
                    if (_this.list.length > 0) {
                        var index = _this.playInfo.index = 0;
                        _this.playInfo.url = _this.list[index].url;
                        _this.playInfo.singer = _this.list[index].singer;
                        _this.playInfo.name = _this.list[index].name;
                        _this.playInfo.imgBase = _this.list[index].imgUrl;
                        Media.src = _this.playInfo.url;
                        _this.$forceUpdate()
                    }

                })
                .catch(function(error) {
                    console.log(error);
                    alert("SERVER ERROR")
                });

            // 初始化播放器
            window.playProgress = _this.playInfo.progress;
            window.duration = 0;
            _this.elWidth = document.querySelector('.progress-bar').offsetWidth;
            // 是否可以播放
            _this.listenEvent("canplay", function() {
                Media.volume = _this.playInfo.volume;
                _this.playInfo.duration = this.duration;
                window.duration = this.duration;
                _this.playInfo.time = _this.convertTime(this.duration);
                if (_this.isNext) {
                    this.play()
                }
                _this.isNext = false;
            });
            // 结束
            _this.listenEvent("ended", function() {
                _this.playInfo.progress = 0;
                _this.playInfo.lineTime = '00:00';

                var order = _this.playInfo.order;
                // // 顺序播放
                if (order == 0) {
                    _this.next();
                    return false;
                }
                // 单曲循环
                if (order == 1) {
                    _this.play()
                    return false;
                }
                // 随机播放
                _this.clickList(parseInt(Math.random() * (_this.list.length - 1)));
            });
            // 播放
            _this.listenEvent("play", function() {
                Media.volume = _this.playInfo.volume;
                _this.playInfo.isplay = true;
                clearInterval(playTime)
                playTime = setInterval(function() {
                    _this.setTimeLine(Media.currentTime)
                }, 500);

            });
            // 暂停
            _this.listenEvent("pause", function() {
                clearInterval(playTime)
                _this.playInfo.isplay = false;
            });
            //请求数据时遇到错误  
            _this.listenEvent("error", function() {
                _this.next();
            });

        },
        // 打开搜索页
        openSearch() {
            this.isSearch = true;
            this.search()
        },
        // 点击搜索类表
        clickSearchList(index) {
            this.list.push(this.searchList[index]);
            this.clickList(this.list.length - 1);
        },
        // 搜索
        search() {
            var _this = this;
            this.searchList = [];
            var params = new URLSearchParams();
            params.append("keyWord", this.keyWord)
            axios.post('/searchMusic', params)
                .then(function(response) {
                    _this.searchList = response.data.body;
                    _this.$forceUpdate()
                })
                .catch(function(error) {
                    console.log(error);
                });

            return false;
        },
        // 拖动时获取长度
        moveEvent(req) {
            this.setTimeLine(req)
            Media.currentTime = req
            this.playInfo.isplay = false;
            Media.pause();
        },
        // 进度  条按下
        startEvent(req) {
            this.setTimeLine(req)
            this.playInfo.isplay = false;
            Media.pause();
        },
        // 进度条  松开
        endEvent(req) {
            this.setTimeLine(req)
            Media.currentTime = req
            this.playInfo.isplay = true;
            Media.play();
        },
        setTimeLine(req) {
            var progress = req / Media.duration * 100;
            this.playInfo.progress = progress;
            this.playInfo.lineTime = this.convertTime(req)
        },
        // 转换时长
        convertTime(time) {
            //分钟
            var minute = time / 60;
            var minutes = parseInt(minute);
            minutes = minutes < 10 ? "0" + minutes : minutes;
            //秒
            var second = time % 60;
            var seconds = Math.round(second);
            seconds = seconds < 10 ? "0" + seconds : seconds;

            //总共时长的秒数
            return minutes + ':' + seconds;
        },
        // 播放
        play(event) {
            if (this.playInfo.isplay) {
                Media.pause();
            } else {
                Media.play();
            }
        },
        // 上一首
        last(event) {
            var order = this.playInfo.order;
            this.playInfo.progress = 0;
            this.playInfo.lineTime = '00:00';
            // 随机播放
            if (order == 2) {
                this.clickList(parseInt(Math.random() * (this.list.length - 1)));
                return false;
            }
            var index = this.playInfo.index - 1;
            if (index < 0) index = this.list.length - 1;
            this.isNext = true;
            this.playInfo.isplay = false;
            this.setPlayInfo(index);
        },
        // 下一首
        next(event) {
            this.playInfo.progress = 0;
            this.playInfo.lineTime = '00:00';
            var order = this.playInfo.order;
            // 随机播放
            if (order == 2) {
                this.clickList(parseInt(Math.random() * (this.list.length - 1)));
                return false;
            }

            var index = this.playInfo.index + 1;
            if (index >= this.list.length) index = 0;
            this.isNext = true;
            this.playInfo.isplay = false;
            this.setPlayInfo(index);
        },



        // 音量调节
        volume(vol, direction) {
            var _this = this;
            clearInterval(this.volumeTime)
            vol = vol < 0 ? 0 : vol;
            vol = vol > 1 ? 1 : vol;
            var count = 0;
            if (!direction == 'touch') {
                this.volumeTime = setInterval(function() {
                    count = count + 8;
                    if (count < 1000) return false;
                    if (direction == 'high') {
                        vol = vol + 0.01;
                        vol = vol > 1 ? 1 : vol;
                    } else {
                        vol = vol - 0.01;
                        vol = vol < 0 ? 0 : vol;
                    }
                    _this.playInfo.volume = vol
                    Media.volume = _this.playInfo.volume;
                }, 10)
            }
            this.playInfo.volume = vol;
            Media.volume = this.playInfo.volume;
        },
        // 设置播放顺序方式
        setOrder() {
            this.playInfo.order++;
            if (this.playInfo.order > 2) {
                this.playInfo.order = 0
            }
        },

        // 点击音乐列表
        clickList(index) {
            this.playInfo.progress = 0;
            this.playInfo.progress = 0;
            this.playInfo.lineTime = '00:00';
            this.isNext = true;
            this.playInfo.isplay = false;
            Media.pause();
            this.setPlayInfo(index);
        },

        // 设置播放信息
        setPlayInfo(index) {
            clearInterval(this.isPlayTime);
            // Media.pause();
            var _this = this;


            this.playInfo.url = this.list[index].url;
            this.playInfo.singer = this.list[index].singer;
            this.playInfo.name = this.list[index].name;
            this.playInfo.index = index;
            var params = new URLSearchParams();
            params.append("mid", this.list[index].id)
            params.append("name", this.list[index].name)
            params.append("singer", this.list[index].singer)
            params.append("imgUrl", this.list[index].imgUrl)

            if (this.playInfo.url) {
                Media.src = this.playInfo.url
                if (_this.isSearch) {
                    Media.play()
                }
            }

            axios.post('/musicOnDemand', params)
                .then(function(response) {
                    if (response.data.code != 0) return false;
                    // 判断有没有URL
                    if (!_this.playInfo.url) {
                        console.log(response.data.body)
                        Media.src = response.data.body.url;
                        _this.list[index].url = response.data.body.url;
                        if (_this.isSearch) {
                            setTimeout(function() {
                                var img = new Image();
                                img.src = _this.list[index].imgUrl;
                                img.onload = function() {
                                    _this.playInfo.imgBase = img.src;
                                };
                            }, 1000)
                        }
                    }
                })
                .catch(function(error) {
                    console.log(error);
                    _this.next();
                });
            //IOS兼容问题 
            if (!_this.isSearch && this.isNext && (isPhone != 'Android' && isPhone != false)) {
                _this.isPlayTime = setInterval(function() {
                    if (!_this.playInfo.isplay) {
                        clearInterval(_this.isPlayTime);
                        Media.play();
                    }
                }, 500)
            };

            // img.onerror = function() { alert("error!") };
        },
        // 音频事件监听
        listenEvent(e, callback) {
            Media.addEventListener(e, callback);
        },
    },
    directives: {
        range: {
            // 当被绑定的元素插入到 DOM 中时……
            bind: function(el, binding) {
                var X = 0,
                    disX = 0,
                    evt = isPhone ? 'touchstart' : 'mousedown';
                el.addEventListener(evt, Start, false);

                function Start(event) {

                    document.addEventListener('mouseup', End, false)

                    var ev = event || window.event;
                    if (isPhone) {
                        disX = ev.touches[0].clientX - el.offsetLeft;
                        el.parentNode.addEventListener('touchmove', Move, false);
                        el.parentNode.addEventListener('touchend', End, false)
                    } else {
                        disX = ev.clientX - el.offsetLeft;
                        el.parentNode.addEventListener('mousemove', Move, false);
                        el.parentNode.addEventListener('mouseup', End, false)
                    }
                    binding.value.Start(Media.currentTime);
                }

                function Move(event) {
                    var ev = event || window.event;
                    X = isPhone ? ev.touches[0].clientX : ev.clientX
                    var L = X - disX;
                    var M = L;

                    if (L < 0) {
                        L = 0;
                        M = 0;
                    } else if (L > el.parentNode.offsetWidth - el.offsetWidth) {
                        M = el.parentNode.offsetWidth;
                        L = el.parentNode.offsetWidth - el.offsetWidth;
                    }
                    // 定义一个滚动的比例,因为L的大小是由上面的判断语句决定的，所以scale需要定义在判断语句下面，定义在上面会出问题
                    var scale = parseInt((L / (el.parentNode.offsetWidth - el.offsetWidth)).toPrecision(2) * 100);

                    // 下面这种方法精度没那么高
                    var time = (duration / (el.parentNode.offsetWidth - 11)) * M;
                    binding.value.Move(time, scale)
                }

                function End(event) {
                    binding.value.End(Media.currentTime)

                    el.parentNode.removeEventListener("touchend", Move, false);
                    el.parentNode.removeEventListener("touchmove", End, false);
                    el.parentNode.removeEventListener("mousemove", Move, false);
                    el.parentNode.removeEventListener("mouseup", End, false);
                    document.removeEventListener('mouseup', End, false)
                }
            }
        },
        rangeber: {
            bind: function(el, binding) {
                var parentObj, evt = isPhone ? 'touchstart' : 'mousedown';
                el.addEventListener(evt, Start, false);

                function Start(event) {
                    parentObj = document.querySelector("#music");
                    var ev = event || window.event;
                    var clientX = isPhone ? event.touches[0].clientX : event.clientX;
                    evt = isPhone ? 'mouseup' : 'touchend';

                    var X = parentObj.offsetLeft + el.offsetLeft - clientX

                    if (X <= 0 && Math.abs(X) < el.clientWidth) {
                        var time = (duration / el.clientWidth) * Math.abs(X);
                        el.addEventListener(evt, End(time), false)
                    }
                }

                function End(value) {
                    binding.value.Event(value)
                    el.removeEventListener("touchend", End, false);
                    el.removeEventListener("mouseup", End, false);
                }
            }
        },
        rangevol: {
            bind: function(el, binding) {
                var parentObj, evt = isPhone ? 'touchstart' : 'mousedown';
                el.addEventListener(evt, Start, false);

                function Start(event) {
                    parentObj = document.querySelector("#music");
                    var ev = event || window.event;
                    var clientX = isPhone ? event.touches[0].clientX : event.clientX;
                    evt = isPhone ? 'mouseup' : 'touchend';

                    var X = parentObj.offsetLeft + el.offsetLeft - clientX
                    el.addEventListener(evt, End(Math.abs(X) / el.clientWidth), false)
                }

                function End(value) {
                    binding.value.Event(value, 'touch')
                    el.removeEventListener("touchend", End, false);
                    el.removeEventListener("mouseup", End, false);
                }
            }
        }
    }
})