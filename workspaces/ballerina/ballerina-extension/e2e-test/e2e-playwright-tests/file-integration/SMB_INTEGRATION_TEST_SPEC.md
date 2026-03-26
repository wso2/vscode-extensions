# SMB Integration - Test Specification

## Application Overview

The SMB Integration feature in WSO2 Integrator: BI allows users to create services that monitor a directory on an SMB (Server Message Block) file share for file events. The integration can be configured with SMB server connection details, share name, path, and event handlers.

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **SMB Service** option in Artifacts menu (under "File Integration" section)
- **Create** button (in service creation form)
- **Cancel** button (in service creation form)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing service
- **Delete** button (icon: 🗑️) - for deleting service
- **Add Handler** button (text: "Add Handler", icon: ➕) - for adding event handlers
  - Handler option: "onCreate"
  - Handler option: "onDelete"

### Form Fields
- **Host** textbox (required, type: string)
  - Description: "Target SMB server hostname or IP address."
  - Default value: "127.0.0.1"
- **Port** textbox (required, type: int)
  - Description: "Target SMB server port."
  - Default value: "445"
  - Has helper panel and expand editor buttons
- **Share** textbox (required, type: string)
  - Description: "The SMB share name to connect to."
- **Path** textbox (required, type: string)
  - Description: "The path within the share to be monitored."
  - Has Text/Expression toggle
  - Default value: "/"
- **Advanced Configurations** expandable section (collapsed by default):
  - **Listener Name** textbox (required, default: "smbListener")
    - Description: "Provide a name for the listener being created"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Service** breadcrumb
- **Service Designer** breadcrumb

### Tree View Elements
- **Entry Points** section
- **SMB Service** tree item (smb:Service)
- **onCreate** tree item (under SMB Service)
- **Listeners** section
- **smbListener** tree item (under Listeners, smb:Listener)
- **File Handlers** section (in service designer):
  - Shows "No file handlers found. Add a new file handler." when empty
  - Handler items appear as cards with Event name and Configure/Delete buttons

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="smb-service-option"`
2. `data-testid="smb-host-input"`
3. `data-testid="smb-port-input"`
4. `data-testid="smb-share-input"`
5. `data-testid="smb-path-input"`
6. `data-testid="smb-path-text-toggle"`
7. `data-testid="smb-path-expression-toggle"`
8. `data-testid="smb-listener-name-input"`
9. `data-testid="add-handler-button"`
10. `data-testid="on-create-handler-option"`
11. `data-testid="on-delete-handler-option"`
12. `data-testid="create-smb-service-button"`
13. `data-testid="configure-smb-service-button"`
14. `data-testid="delete-smb-service-button"`

---

## Test Scenarios

### 1. Create SMB Integration

**Description:** Creates SMB file listener

**Prerequisites:**
- BI extension is active
- Test project is open
- No existing SMB integration with same listener name

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "File Integration" section, click on "SMB Service" option
6. Verify the "Create SMB Service" form is displayed
7. Locate the "Host" input field
8. Verify default value is "127.0.0.1"
9. (Optional) Modify host to "smb.example.com"
10. Locate the "Port" input field
11. Verify default value is "445"
12. (Optional) Modify port to "1445"
13. Locate the "Share" input field
14. Enter share name (e.g., "myshare")
15. Locate the "Path" input field
16. Verify "Text" mode is selected by default
17. Verify default value is "/"
18. (Optional) Modify path to "/uploads"
19. Click on "Advanced Configurations" to expand
20. Verify "Listener Name" field has default value "smbListener"
21. (Optional) Modify listener name to "mySmbListener"
22. Click on "Create" button
23. Verify the integration is created successfully

**Expected Results:**
- SMB Service is created with specified configuration
- Integration appears in the "Entry Points" section of the project tree
- Service designer view is displayed
- Listener shows as "smbListener" (or custom name)
- File Handlers section shows "No file handlers found" message

**Element Identifiers:**
- Add Artifact button: `button[aria-label*="Add Artifact"]` or `button:has-text("Add Artifact")`
- SMB Service option: `div:has-text("SMB Service")` (in Artifacts menu, under File Integration)
- Host input: `input[placeholder*="Host"]` or `textbox[name="Host"]`
- Port input: `input[type="number"]` or `textbox[name="Port"]`
- Share input: `textbox[name="Share"]`
- Path input: `textbox[name="Path"]`
- Create button: `button:has-text("Create")`

---

### 2. Edit SMB Integration

**Description:** Modify SMB server config

**Prerequisites:**
- SMB integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the SMB Service in the project tree
2. Click on the "Configure" button (⚙️ icon)
3. Verify the edit form is displayed with current values
4. Locate the "Host" input field
5. Modify host value to "new-smb.example.com"
6. Locate the "Port" input field
7. Modify port value to "1445"
8. Locate the "Share" input field
9. Modify share name
10. Locate the "Path" input field
11. Modify path value to "/new-path"
12. Click on "Save Changes" button
13. Verify changes are saved

**Expected Results:**
- SMB Service configuration is updated
- New host, port, share, and path values are reflected in the service designer
- Listener name is updated (if changed)
- Service continues to function with new configuration

**Element Identifiers:**
- Configure button: `button:has-text("Configure")` or `button[aria-label*="Configure"]`
- Host input: `textbox[name="Host"]`
- Port input: `textbox[name="Port"]`
- Share input: `textbox[name="Share"]`
- Path input: `textbox[name="Path"]`

---

### 3. Add onCreate Handler

**Description:** Add onCreate handler for file creation events

**Prerequisites:**
- SMB integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the SMB Service in the project tree
2. Verify service designer view is displayed
3. Locate the "File Handlers" section
4. Verify "No file handlers found" message or existing handlers list
5. Click on the "Add Handler" button
6. Verify handler selection dialog is displayed
7. Locate the "onCreate" handler option
8. Click on "onCreate" handler option
9. Verify handler is added to the File Handlers section
10. Verify handler card shows "Event: onCreate"
11. Verify Configure and Delete buttons are available

**Expected Results:**
- onCreate handler is added successfully
- Handler appears in the File Handlers section
- Handler appears in the project tree under SMB Service
- Handler can be configured or deleted

**Element Identifiers:**
- Add Handler button: `button:has-text("Add Handler")`
- onCreate handler option: `div:has-text("onCreate")`
- Handler card: `div:has-text("Event: onCreate")`

---

### 4. Add onDelete Handler

**Description:** Add onDelete handler for file deletion events

**Prerequisites:**
- SMB integration exists in the project
- Service designer view is accessible

**Steps:**
1. Navigate to the SMB Service in the project tree
2. Verify service designer view is displayed
3. Locate the "File Handlers" section
4. Click on the "Add Handler" button
5. Verify handler selection dialog is displayed
6. Locate the "onDelete" handler option
7. Click on "onDelete" handler option
8. Verify handler is added to the File Handlers section

**Expected Results:**
- onDelete handler is added successfully
- Handler appears in the File Handlers section
- Handler appears in the project tree under SMB Service

**Element Identifiers:**
- Add Handler button: `button:has-text("Add Handler")`
- onDelete handler option: `div:has-text("onDelete")`

---

### 5. Configure File Format and Content Schema

**Description:** Set file format and content schema for onCreate handler

**Prerequisites:**
- SMB integration exists with onCreate handler

**Steps:**
1. Navigate to the SMB Service in the project tree
2. Click on the onCreate handler to configure
3. Verify the handler configuration panel is displayed
4. Locate the "File Format" dropdown
5. Select a file format (e.g., JSON, CSV, XML, Text, RAW)
6. (Optional) Click "Define Content Schema" to define a typed schema
7. Configure streaming for large files if needed
8. Enable/disable "File Metadata (fileInfo)" parameter
9. Enable/disable "SMB Connection (caller)" parameter
10. Click "Save" to save the configuration

**Expected Results:**
- File format is configured
- Content schema is defined (if applicable)
- Streaming mode is set as needed
- Handler is saved with the new configuration

---

### 6. Delete SMB Integration

**Description:** Remove integration and verify cleanup

**Prerequisites:**
- SMB integration exists in the project

**Steps:**
1. Navigate to the SMB Service in the project tree
2. Right-click on the service tree item
3. Click on the "Delete" button
4. Verify confirmation (if applicable)
5. Verify the integration is removed from the project tree
6. Verify the service designer view is cleared
7. Verify listener is removed from Listeners section
8. Verify all handlers are removed

**Expected Results:**
- SMB Service is deleted successfully
- Integration is removed from Entry Points section
- Listener is removed from Listeners section
- All associated handlers are removed
- Service designer view is cleared
- No orphaned resources remain

**Element Identifiers:**
- Delete button: `button[aria-label*="Delete"]` or button with delete icon

---

## Notes

- SMB Service uses the SMB (Server Message Block) protocol for Windows file shares
- Default port is 445 (standard SMB port)
- Share name is required in addition to host and path
- Event handlers: onCreate (file created), onDelete (file deleted)
- Handler configuration supports file formats: JSON, CSV, XML, Text, RAW
- Streaming mode is available for large file processing
- File metadata (fileInfo) and SMB connection (caller) are optional parameters
- Default listener name is "smbListener"
- Event handlers are added manually (not automatically created)
