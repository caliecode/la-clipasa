#!/usr/bin/env python3
import json
import glob
import os

def clean_data(data):
    """Remove empty mod fields and null approved_at_utc"""
    # Fields to check and remove if empty
    fields_to_check = {
        'mod_note': '',
        'mod_reports': [],
        'mod_reason_title': '',
        'approved_at_utc': None
    }

    # Create a new dict without empty fields
    return {k: v for k, v in data.items()
            if k not in fields_to_check or v != fields_to_check.get(k)}

def check_mod_fields(data):
    """Check if moderation fields are populated with non-empty values"""
    has_mod_content = False
    details = []

    if data.get('mod_note') and data['mod_note'].strip():
        has_mod_content = True
        details.append(f"mod_note: {data['mod_note']}")

    if data.get('mod_reason_title') and data['mod_reason_title'].strip():
        has_mod_content = True
        details.append(f"mod_reason_title: {data['mod_reason_title']}")

    if data.get('mod_reports') and len(data['mod_reports']) > 0:
        has_mod_content = True
        details.append(f"mod_reports: {data['mod_reports']}")

    return has_mod_content, details

def process_json_files():
    unwanted_flairs = [
        "Caliebre... mirame MIRAMEEEEEEEEEEE MIRAMEEEEEEEEEEEEEEEEEEEEEEE",
        "Clip",
        "INFORMACIÓN :travieso:",
        "PRIMER MEMITO",
        "ÚLTIMO POST PERDIDO",
        ":ICONOINFO:  INFORMACIÓN",
        ":ICONOPELI:  SPOILER DE ELDENRING"
    ]

    files_with_mod_content = []

    for filename in glob.glob('./**/*.json', recursive=True):
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                data = json.load(file)

            # Check for mod content
            has_mod_content, mod_details = check_mod_fields(data)
            if has_mod_content:
                files_with_mod_content.append({
                    'filename': filename,
                    'details': mod_details
                })

            flair = data.get('link_flair_text')

            if flair is None:
                continue

            # Check if file should be deleted
            if flair in unwanted_flairs:
                os.remove(filename)
                print(f"Deleted: {filename}")
                continue

            # Check if flair needs to be renamed
            modified = False

            if "ORO" in flair:
                data['link_flair_text'] = "ORO"
                modified = True
            elif "DIAMANTE" in flair:
                data['link_flair_text'] = "DIAMANTE"
                modified = True
            elif "Meme Artesanal" in flair:
                data['link_flair_text'] = "MEME_ARTESANAL"
                modified = True

            # Clean and save file
            if modified:
                cleaned_data = clean_data(data)
                with open(filename, 'w', encoding='utf-8') as file:
                    json.dump(cleaned_data, file, ensure_ascii=False, indent=2)
                print(f"Modified: {filename}")

        except Exception as e:
            print(f"Error processing {filename}: {str(e)}")

    if files_with_mod_content:
        print("\nFiles with non-empty moderation content:")
        for file_info in files_with_mod_content:
            print(f"\nFile: {file_info['filename']}")
            for detail in file_info['details']:
                print(f"  {detail}")
    else:
        print("\nNo files found with populated moderation fields.")

if __name__ == "__main__":
    print("Starting JSON file processing...")
    process_json_files()
    print("Processing complete!")
