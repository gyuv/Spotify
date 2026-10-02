package app.rymusic.player;

import android.app.UiModeManager;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Tag the WebView on Android TV so the web app picks its 10-foot D-pad layout.
        UiModeManager ui = (UiModeManager) getSystemService(UI_MODE_SERVICE);
        if (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) {
            WebSettings s = getBridge().getWebView().getSettings();
            s.setUserAgentString(s.getUserAgentString() + " RYMusicTV");
            getBridge().getWebView().reload();
        }
    }
}
