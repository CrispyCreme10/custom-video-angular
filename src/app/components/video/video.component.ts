import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import { WebVTTCue, parseWebVTT } from 'src/resources/webvtt-parser/parser';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss']
})
export class VideoComponent implements OnInit, AfterViewInit {
  @ViewChild('video') videoElem!: ElementRef<HTMLVideoElement>;
  @ViewChild('track') trackElem!: ElementRef<HTMLTrackElement>;
  @ViewChild('videoControls') videoControlsElem!: ElementRef<HTMLDivElement>;
  @ViewChild('playPause') playPauseElem!: ElementRef<HTMLButtonElement>;

  transcriptUrl = 'assets/test.vtt';
  cues: WebVTTCue[] = [];
  activeCuesMap: { [key: number]: boolean } = {};

  // icons
  faPlay = faPlay;

  constructor(
    private renderer: Renderer2,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.extractTranscript();
  }

  ngAfterViewInit(): void {
    if (this.videoElem.nativeElement.canPlayType('video/mp4')) {
      this.setupCustomVideo();
    }
  }

  private setupCustomVideo() {
    this.videoElem.nativeElement.controls = false;
    this.videoControlsElem.nativeElement.style.display = "flex";

    // cuechange
    this.renderer.listen(this.trackElem.nativeElement, 'cuechange', (event: Event) => {
      console.log('cuechange: ', event);
      console.log((event.target as HTMLTrackElement).track);
    });

    // play/pause click
    this.renderer.listen(this.playPauseElem.nativeElement, 'click', e => {
      const el = this.videoElem.nativeElement;
      if (el.paused || el.ended) {
        el.play();
      } else {
        el.pause();
      }
    })
  }

  private extractTranscript() {
    this.http.get(this.transcriptUrl, {
      headers: new HttpHeaders().set('Content-Type', 'text/vtt'),
      responseType: 'text'
    }).subscribe(data => {
      this.cues = parseWebVTT(data);
      for (let i = 0; i < this.cues?.length; i++) {
        this.activeCuesMap = {
          ...this.activeCuesMap,
          [i]: false
        } 
      }
      console.log(this.cues);
    })
  }
}
