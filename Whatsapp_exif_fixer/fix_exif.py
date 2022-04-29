from datetime import datetime
import piexif

import os
import time

errors_count = 0
errors_names = []

folder = "./process_images/"


def get_datetime(filename):
    date_str = filename.split("-")[1]
    return datetime.strptime(date_str, "%Y%m%d")


def get_date(filename):
    date_str = filename.split("-")[1]
    date_str2 = filename.split("-")[2][4:6]

    if date_str2 == "00" or int(date_str2) >= 24:
        return datetime.strptime(date_str, "%Y%m%d").strftime("%Y:%m:%d %H:%M:%S")
    else:
        return datetime.strptime(date_str + date_str2, "%Y%m%d%H").strftime("%Y:%m:%d %H:%M:%S")


allowedFileEndings = ["mp4", "jpg", "3gp", "jpeg"]

filenames = [fn for fn in os.listdir(folder) if fn.split(".")[-1] in allowedFileEndings]

num_files = len(filenames)
print("Number of files: {}".format(num_files))

for i, filename in enumerate(filenames):
    try:

        if filename.endswith("mp4") or filename.endswith("3gp"):
            date = get_datetime(filename)
            modTime = time.mktime(date.timetuple())
            os.utime(folder + filename, (modTime, modTime))

        elif filename.endswith("jpg") or filename.endswith("jpeg"):
            exif_dict = {"Exif": {piexif.ExifIFD.DateTimeOriginal: get_date(filename)}}
            exif_bytes = piexif.dump(exif_dict)
            piexif.insert(exif_bytes, folder + filename)

        num_digits = len(str(num_files))
        print(
            "{num:{width}}/{max} - {filename}".format(
                num=i + 1, width=num_digits, max=num_files, filename=folder + filename
            )
        )
    except:
        errors_count = errors_count + 1
        errors_names.append(filename)
        pass
print("\nDone!")
print("\nErroes:" + str(errors_count) + "!")
print(f"\n{errors_names}")
