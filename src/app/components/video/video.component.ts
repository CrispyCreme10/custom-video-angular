import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { WebVTTCue, parseWebVTT } from 'src/resources/webvtt-parser/parser';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss']
})
export class VideoComponent implements OnInit, AfterViewInit {
  @ViewChild('track') trackElem!: ElementRef<HTMLTrackElement>;

  transcriptUrl = 'assets/test.vtt';

  cues: WebVTTCue[] = [];

  constructor(
    private renderer: Renderer2,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.extractTranscript();
  }

  ngAfterViewInit(): void {
    console.log(this.trackElem.nativeElement.track);
    this.renderer.listen(this.trackElem.nativeElement, 'cuechange', (event: Event) => {
      console.log('cuechange: ', event);
      console.log((event.target as HTMLTrackElement).track);
    });
  }

  private extractTranscript() {
    this.http.get(this.transcriptUrl, {
      headers: new HttpHeaders().set('Content-Type', 'text/vtt'),
      responseType: 'text'
    }).subscribe(data => {
      // console.log(data);
      this.cues = parseWebVTT(data);
      console.log(this.cues);
    })
  }
}
