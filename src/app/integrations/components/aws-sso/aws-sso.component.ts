import {Component, OnInit} from '@angular/core';
import {IntegrationsService} from '../../integrations.service';
import {AwsSsoService} from '../../providers/aws-sso.service';
import {Router} from '@angular/router';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {AppService} from '../../../services-system/app.service';
import {ConfigurationService} from '../../../services-system/configuration.service';
import {merge} from 'rxjs';
import {fromPromise} from 'rxjs/internal-compatibility';
import {environment} from '../../../../environments/environment';
import {tap} from 'rxjs/operators';
import {KeychainService} from '../../../services-system/keychain.service';
import {AntiMemLeak} from '../../../core/anti-mem-leak';

@Component({
  selector: 'app-aws-sso',
  templateUrl: './aws-sso.component.html',
  styleUrls: ['./aws-sso.component.scss']
})
export class AwsSsoComponent extends AntiMemLeak implements OnInit {

  isAwsSsoActive: boolean;
  regions = [];
  selectedRegion;
  portalUrl;

  public form = new FormGroup({
    portalUrl: new FormControl('', [Validators.required, Validators.pattern('https?://.+')]),
    awsRegion: new FormControl('', [Validators.required])
  });

  constructor(
    private appService: AppService,
    private configurationservice: ConfigurationService,
    private integrationsService: IntegrationsService,
    private awsSsoService: AwsSsoService,
    private router: Router,
    private keychainService: KeychainService
  ) { super(); }

  ngOnInit() {
    this.subs.add(this.awsSsoService.isAwsSsoActive().subscribe(res => {
      this.isAwsSsoActive = res;
      this.setValues();
    }));
  }

  login() {
    if (this.form.valid) {
      this.integrationsService.login(this.form.value.portalUrl, this.selectedRegion);
    }
  }

  logout() {
    this.integrationsService.logout();
    this.isAwsSsoActive = false;
    this.setValues();
  }

  forceSync() {
    this.integrationsService.syncAccounts();
  }

  goBack() {
    this.router.navigate(['/', 'integrations', 'list']);
  }

  setValues() {
    this.regions = this.appService.getRegions();
    this.selectedRegion = this.regions[0].region;

    if (this.isAwsSsoActive) {
      this.subs.add(merge(
        fromPromise<string>(this.keychainService.getSecret(environment.appName, 'AWS_SSO_REGION')).pipe(tap(res => { this.selectedRegion = res; })),
        fromPromise<string>(this.keychainService.getSecret(environment.appName, 'AWS_SSO_PORTAL_URL')).pipe(tap(res => {
          this.portalUrl = res;
          this.form.controls['portalUrl'].setValue(res);
        }))
      ).subscribe());
    }
  }
}
