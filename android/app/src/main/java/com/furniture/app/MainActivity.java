package com.furniture.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HttpBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
