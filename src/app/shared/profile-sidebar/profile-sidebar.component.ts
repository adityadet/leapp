import {Component, OnInit} from '@angular/core';
import {AppService, LoggerLevel, ToastLevel} from '../../services-system/app.service';
import {ConfigurationService} from '../../services-system/configuration.service';
import {Router} from '@angular/router';
import {AntiMemLeak} from '../../core/anti-mem-leak';
import {HttpClient} from '@angular/common/http';
import {ExecuteServiceService} from '../../services-system/execute-service.service';
import {ProxyService} from '../../services/proxy.service';

@Component({
  selector: 'app-profile-sidebar',
  templateUrl: './profile-sidebar.component.html',
  styleUrls: ['./profile-sidebar.component.scss']
})
export class ProfileSidebarComponent extends AntiMemLeak implements OnInit {

  profileOpen = false;
  test: any;

  /* Profile Sidebar with links */
  constructor(
    private appService: AppService,
    private configurationService: ConfigurationService,
    private router: Router,
    private httpClient: HttpClient,
    private executeService: ExecuteServiceService,
    private proxyService: ProxyService
  ) { super(); }

  /**
   * Init the profile sidebar using the event emitter status listener
   */
  ngOnInit() {
    const sub = this.appService.profileOpen.subscribe(res => {
      this.profileOpen = res;
    });
    this.subs.add(sub);
  }

  /**
   * logout from Leapp
   */
  logout() {
    // Google clean
    const workspace = this.configurationService.getDefaultWorkspaceSync();

    this.proxyService.get('https://mail.google.com/mail/u/0/?logout&hl=en', (res) => {
      this.appService.logger('logout res status code: ', LoggerLevel.INFO, this, res.statusCode);
      if (res.statusCode !== 407) {
        this.configurationService.newConfigurationFileSync();
      } else {
        this.appService.toast('Failed to logout: Proxy auth denied.', ToastLevel.WARN, 'Proxy Auth failed');
      }
    }, (err) => {
      this.appService.logger('logout error: ', LoggerLevel.ERROR, this, err.stack);
    });

    // Azure Clean
    this.appService.logger('Cleaning Azure config files...', LoggerLevel.INFO, this);

    workspace.azureProfile = null;
    workspace.azureConfig = null;
    this.configurationService.updateWorkspaceSync(workspace);
    this.subs.add(this.executeService.execute('az account clear 2>&1').subscribe(res => {}, err => {}));
  }

  /**
   * Go to Account Management
   */
  gotToAccountManagement() {
    this.closeProfile();
    this.router.navigate(['/sessions', 'list-accounts']);
  }

  closeProfile() {
    this.profileOpen = false;
    this.appService.profileOpen.emit(false);
    this.appService.logger(`Profile open emitting: ${this.profileOpen}`, LoggerLevel.INFO, this);
  }

  goToProfile() {
    this.closeProfile();
    this.router.navigate(['/profile']);
  }
}
