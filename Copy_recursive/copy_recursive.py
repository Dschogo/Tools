import sys
import os
import shutil
import tqdm
import math

the_path = "G:\Samples\Cymatics"

add_path = "_temp_copy"

result = [os.path.join(dp, f) for dp, dn, filenames in os.walk(the_path) for f in filenames if not f.endswith(add_path)]


print(len(result))

size0 = 0
print("RENAMING")
for i in tqdm.tqdm(range(len(result))):
    size0 += os.path.getsize(result[i])
    os.rename(result[i], result[i] + add_path)

print("COPY")
pbar = tqdm.tqdm(total=math.floor(size0 / 1000000))

for i in tqdm.tqdm(range(len(result))):
    pbar.set_description(
        "Copying: " + result[i] + "  " + str(math.floor(os.path.getsize(result[i] + add_path) / 1000000)) + "mb"
    )
    shutil.copy(result[i] + add_path, result[i])
    pbar.update(math.floor(os.path.getsize(result[i]) / 1000000))


pbar.close()

print("ERROR CHECKING")

size1 = 0
for i in tqdm.tqdm(range(len(result))):
    # if not filecmp.cmp(result[i], result[i] + add_path):
    #     err_count += 1
    size1 += os.path.getsize(result[i] + add_path)

    # display size
if size0 != size1:
    print("Folder size: " + str(size0) + " bytes   " + str(size1) + " bytes")
    sys.exit()

print("DELETE RENAMED SOURCE")
for i in tqdm.tqdm(range(len(result))):
    os.remove(result[i] + add_path)

print("DONE")
