import sys
import os
import shutil
import tqdm
import datetime
import math

source = "G:"
dest = "H:\Programs\G"

source_res = [os.path.join(dp, f) for dp, dn, filenames in os.walk(source) for f in filenames]

size_total = 0
for i in tqdm.tqdm(range(len(source_res))):
    size_total += os.path.getsize(source_res[i])
pbar = tqdm.tqdm(total=math.floor(size_total / 1000000))

skip_count = 0

for i in tqdm.tqdm(range(len(source_res))):

    if os.path.exists(source_res[i].replace(source, dest)):
        if os.path.getsize(source_res[i]) == os.path.getsize(source_res[i].replace(source, dest)):
            skip_count += 1
            print(
                f"{datetime.datetime.now().strftime('%H:%M:%S')} : skipping {skip_count}/{len(source_res)}: {source_res[i]}"
            )
            pbar.update(math.floor(os.path.getsize(source_res[i]) / 1000000))
            continue
        else:
            os.remove(source_res[i].replace(source, dest))
    pbar.set_description(
        "Copying: " + source_res[i] + "  " + str(math.floor(os.path.getsize(source_res[i]) / 1000000)) + "mb"
    )
    os.makedirs(os.path.dirname(source_res[i].replace(source, dest)), exist_ok=True)
    shutil.copy(source_res[i], source_res[i].replace(source, dest))
    pbar.update(math.floor(os.path.getsize(source_res[i]) / 1000000))

pbar.close()
print("")
print("")
print(f"Done  skipped {skip_count}/{len(source_res)} files")

bad_coppied = []
for i in tqdm.tqdm(range(len(source_res))):
    if os.path.exists(source_res[i].replace(source, dest)):
        if os.path.getsize(source_res[i]) == os.path.getsize(source_res[i].replace(source, dest)):
            bad_coppied.append(source_res[i])

print(bad_coppied)
with open("log.txt", "w") as file:
    for item in bad_coppied:
        file.write(item + "\n")
if bad_coppied:
    print("RERUN TOOL, THE COPY DOESNT MATCH THE SOURCE!!!")
