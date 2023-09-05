import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import {
  faCirclePlay as faCirclePlayRegular,
  faClosedCaptioning as faClosedCaptioningRegular,
} from '@fortawesome/free-regular-svg-icons';
import {
  faCirclePlay as faCirclePlaySolid,
  faClosedCaptioning as faClosedCaptioningSolid,
  faExpand,
  faGear,
  faMaximize,
  faMinimize,
  faPause,
  faPlay,
  faVolumeHigh,
  faVolumeLow,
  faVolumeXmark,
} from '@fortawesome/free-solid-svg-icons';
import { WebVTTCue, parseWebVTT } from 'src/resources/webvtt-parser/parser';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss'],
})
export class VideoComponent implements OnInit, AfterViewInit {
  @ViewChild('video') videoElem!: ElementRef<HTMLVideoElement>;
  @ViewChild('track') trackElem!: ElementRef<HTMLTrackElement>;
  @ViewChild('videoControls') videoControlsElem!: ElementRef<HTMLDivElement>;
  @ViewChild('progressBar') progressBarElem!: ElementRef<HTMLDivElement>;
  @ViewChild('progressBuffer') progressBufferElem!: ElementRef<HTMLDivElement>;
  @ViewChild('progressHover') progressHoverElem!: ElementRef<HTMLDivElement>;
  @ViewChild('progressHoverPadding')
  progressHoverPaddingElem!: ElementRef<HTMLDivElement>;
  @ViewChild('progressFill') progressFillElem!: ElementRef<HTMLDivElement>;
  @ViewChild('playPause') playPauseElem!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeContainer')
  volumeContainerElem!: ElementRef<HTMLDivElement>;
  @ViewChild('volume') volumeElem!: ElementRef<HTMLDivElement>;
  @ViewChild('volumeSlider') volumeSliderElem!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltip') tooltipElem!: ElementRef<HTMLDivElement>;

  transcriptUrl = 'assets/test.vtt';
  cues: WebVTTCue[] = [];
  activeCuesMap: { [key: number]: boolean } = {};

  // video state
  isPlaying: boolean = false;
  isMuted: boolean = false;
  isVolumeHigh: boolean = true;
  areControlsVisible: boolean = true;
  isAutoPlayOn: boolean = false;
  isClosedCaptionOn: boolean = false;
  isLargeAdjViewMode: boolean = false;
  showVolumeSlider: boolean = false;
  isDraggingProgress: boolean = false;
  currentVideoTime: string = '00:00';
  totalVideoTime: string = '00:00';
  lastTimeMouseMoveInVideo: number = 0;
  hideVideoControlsTimeoutId: number = -1;
  lastVolumeBeforeMute: number = 0;
  volumeValue: number = 100;
  videoDurationMs: number = 0;

  // icons
  faPlay = faPlay;
  faPause = faPause;
  faVolumeHigh = faVolumeHigh;
  faVolumeLow = faVolumeLow;
  faVolumeXMark = faVolumeXmark;
  faCirclePlaySolid = faCirclePlaySolid;
  faCirclePlayRegular = faCirclePlayRegular;
  faClosedCaptionSolid = faClosedCaptioningSolid;
  faClosedCaptionRegular = faClosedCaptioningRegular;
  faGear = faGear;
  faMaximize = faMaximize;
  faMinimize = faMinimize;
  faExpand = faExpand;

  constructor(private renderer: Renderer2, private http: HttpClient) {}

  ngOnInit(): void {
    this.extractTranscript();
  }

  ngAfterViewInit(): void {
    if (this.videoElem.nativeElement.canPlayType('video/mp4')) {
      this.videoDurationMs = this.videoElem.nativeElement?.duration * 1000 || 0;
      console.log(this.videoDurationMs);

      this.renderer.listen(document, 'mousemove', (e: MouseEvent) => {
        if (!this.isDraggingProgress) return;

        this.onSeek(this.progressHoverPaddingElem.nativeElement, e.clientX);
      });

      this.setupCustomVideo();
    }
  }

  private setupCustomVideo() {
    this.videoElem.nativeElement.controls = false;
    this.videoControlsElem.nativeElement.style.display = 'flex';

    // video
    this.setVideo();

    // progress bar
    this.renderer.listen(
      this.progressHoverPaddingElem.nativeElement,
      'mousemove',
      (e: MouseEvent) => {
        const el = this.progressBarElem.nativeElement;
        const { left } = el.getBoundingClientRect();
        const lineWidth = e.pageX - left;
        const hoverLinePercentage = (lineWidth / el.clientWidth) * 100;
        this.progressHoverElem.nativeElement.style.width =
          hoverLinePercentage + '%';
      }
    );

    this.renderer.listen(
      this.progressHoverPaddingElem.nativeElement,
      'mouseleave',
      (e: MouseEvent) => {
        this.progressHoverElem.nativeElement.style.width = '0';
      }
    );

    // cuechange
    this.renderer.listen(
      this.trackElem.nativeElement,
      'cuechange',
      (event: Event) => {
        console.log('cuechange: ', event);
        console.log((event.target as HTMLTrackElement).track);
      }
    );

    // play/pause click
    this.setPlayPause();

    // volume
    this.setVolume();
  }

  private setVideo() {
    const el = this.videoElem.nativeElement;

    // video click
    this.renderer.listen(el, 'click', (e: Event) => {
      this.setIsVideoPlaying(this.videoElem.nativeElement);
    });

    // video mouse move
    this.renderer.listen(el, 'mousemove', (e: Event) => {
      if (!this.isPlaying) return;

      // this.showVideoControls();

      // if (this.hideVideoControlsTimeoutId !== -1) {
      //   clearTimeout(this.hideVideoControlsTimeoutId);
      // }

      // this.hideVideoControlsTimeoutId = window.setTimeout(() => this.hideVideoControls(), 3000);
    });

    this.renderer.listen(el, 'mouseleave', (e: Event) => {
      if (!this.isPlaying) return;

      // this.hideVideoControls();
    });

    // video loadedmetadata
    this.renderer.listen(el, 'loadedmetadata', (e: Event) => {
      const duration = (e.target as HTMLVideoElement).duration;
      this.totalVideoTime = new Date(Math.round(duration) * 1000)
        .toISOString()
        .slice(duration >= 3600 ? 11 : 14, 19);
    });

    // video progress
    this.renderer.listen(el, 'progress', (e: Event) => {
      const vidElem = e.target as HTMLVideoElement;
      const buffered = vidElem.buffered;
      if (!buffered || buffered?.length === 0) return;
      const bufferedEnd = buffered.end(buffered.length - 1);
      const bufferedPercentage = (bufferedEnd / vidElem.duration) * 100;
      this.progressBufferElem.nativeElement.style.width =
        bufferedPercentage + '%';
    });

    // video timeupdate
    this.renderer.listen(el, 'timeupdate', (e: Event) => {
      const vidElem = e.target as HTMLVideoElement;
      // update current time text
      const currentTime = vidElem.currentTime;
      this.currentVideoTime = new Date(Math.round(currentTime) * 1000)
        .toISOString()
        .slice(currentTime >= 3600 ? 11 : 14, 19);
      // update fill line
      const timePercentage = (currentTime / vidElem.duration) * 100;
      this.progressFillElem.nativeElement.style.width = timePercentage + '%';
    });
  }

  private setPlayPause() {
    const el = this.playPauseElem.nativeElement;
    this.renderer.listen(el, 'click', (e) => {
      this.setIsVideoPlaying(this.videoElem.nativeElement);
    });

    this.renderer.listen(el, 'mouseenter', (e: Event) => {
      // show tooltip above element
      const { left, top } = el.getBoundingClientRect();
      this.showTooltip(
        top - 45,
        left - 5,
        !this.isPlaying,
        'Play (p)',
        'Pause (p)'
      );
    });

    this.renderer.listen(el, 'mouseleave', (e: Event) => {
      this.hideTooltip();
    });
  }

  private setVolume() {
    const elContainer = this.volumeContainerElem.nativeElement;
    this.renderer.listen(elContainer, 'mouseenter', (e: Event) => {
      this.showVolumeSlider = true;
    });

    this.renderer.listen(elContainer, 'mouseleave', (e: Event) => {
      this.showVolumeSlider = false;
    });

    const elSlider = this.volumeSliderElem.nativeElement;
    this.renderer.listen(elSlider, 'input', (e: InputEvent) => {
      const val = Number((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        this.isVolumeHigh = val > 50;
        this.isMuted = val === 0;
        this.updateVolume(val);
      }
    });
  }

  private setIsVideoPlaying(vidElem: HTMLVideoElement) {
    if (vidElem.paused || vidElem.ended) {
      this.isPlaying = true;
      vidElem.play();
    } else {
      this.isPlaying = false;
      vidElem.pause();
      this.showVideoControls();
    }
  }

  private extractTranscript() {
    this.http
      .get(this.transcriptUrl, {
        headers: new HttpHeaders().set('Content-Type', 'text/vtt'),
        responseType: 'text',
      })
      .subscribe((data) => {
        this.cues = parseWebVTT(data);
        for (let i = 0; i < this.cues?.length; i++) {
          this.activeCuesMap = {
            ...this.activeCuesMap,
            [i]: false,
          };
        }
      });
  }

  private showVideoControls() {
    this.areControlsVisible = true;
  }

  private hideVideoControls() {
    this.areControlsVisible = false;
  }

  private updateVolume(volume: number) {
    this.volumeValue = volume;
    this.videoElem.nativeElement.volume = volume / 100;
  }

  onProgressHoverMouseDown(e: MouseEvent) {
    // set drag
    this.isDraggingProgress = true;
    this.onSeek(this.progressHoverPaddingElem.nativeElement, e.clientX);
  }

  onProgressHoverMouseUp(e: MouseEvent) {
    // seek
    this.isDraggingProgress = false;
  }

  onSeek(target: HTMLElement, clientX: number) {
    const { left, width } = target.getBoundingClientRect();
    const clickedPos = (clientX - left) / width;
    this.seekToPosition(clickedPos);
  }

  private seekToPosition(pos: number) {
    if (pos < 0 || pos > 1) return;

    console.log(this.videoDurationMs, pos);

    this.videoElem.nativeElement.currentTime = this.videoDurationMs * pos / 1000;
  }

  toggleMuted() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.lastVolumeBeforeMute = this.videoElem.nativeElement.volume;
      this.updateVolume(0);
    } else {
      this.updateVolume(this.lastVolumeBeforeMute * 100);
    }
  }

  toggleAutoPlay() {
    this.isAutoPlayOn = !this.isAutoPlayOn;
  }

  toggleClosedCaption() {
    this.isClosedCaptionOn = !this.isClosedCaptionOn;
  }

  private showTooltip(
    top: number,
    left: number,
    textCondition: boolean,
    onText: string,
    offText: string
  ) {
    this.tooltipElem.nativeElement.style.top = top.toString() + 'px';
    this.tooltipElem.nativeElement.style.left = left.toString() + 'px';
    this.tooltipElem.nativeElement.children[0].innerHTML = textCondition
      ? onText
      : offText;
    this.tooltipElem.nativeElement.style.display = 'block';
  }

  private hideTooltip() {
    this.tooltipElem.nativeElement.style.display = 'none';
  }
}
