package app.rymusic.player;

import android.app.UiModeManager;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Spotify's web player streams DRM-protected audio (Widevine). Android asks the app before the
        // WebView may use it, so allow that one permission; everything else goes through Capacitor.
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID.equals(r)) {
                        request.grant(new String[] { PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID });
                        return;
                    }
                }
                super.onPermissionRequest(request);
            }
        });
        // Tag the WebView on Android TV so the web app picks its 10-foot D-pad layout.
        UiModeManager ui = (UiModeManager) getSystemService(UI_MODE_SERVICE);
        if (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) {
            WebSettings s = getBridge().getWebView().getSettings();
            s.setUserAgentString(s.getUserAgentString() + " RYMusicTV");
            getBridge().getWebView().reload();
        }
    }
}
