  The project's version is centrally defined within the primary configuration file. The build process automatically reads this version string. Th...
  You only need to bump the version in one single place:                                                                                          
                                                                                                                                                  
  ### 1. In package.json:3
  
  Change line 3:
  
    {
      "name": "furniture-app",
      "version": "1.2",
      ...
  
  ### You do NOT even need to edit the docs/ folder manually!
  
  When you run:
  
    ./build.sh
  
  The script reads package.json automatically and does everything for you:
  
  1. Bakes the new version into the web app code.
  2. Updates version.json with this new version and a timestamp.
  3. Packages the new dist.zip.
  ──────
  ### (Optional) Only if you ever generate and distribute a new .apk installer file:
  
  If you ever want to distribute a completely fresh Android APK installer (instead of an OTA update), also update the native Android version in:  
  
  • build.gradle:10-11:
    versionCode 2      // Increment by 1
    versionName "1.2"  // Matching version string
  

  (For regular Over-The-Air web updates, updating package.json is all you need).
